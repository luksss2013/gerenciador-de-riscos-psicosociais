import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

interface RouteCtx {
  params: Promise<{ itemId: string }>;
}

interface PatchBody {
  hazardDescription?: unknown;
  possibleHarms?: unknown;
  probability?: unknown;
  severity?: unknown;
  existingControls?: unknown;
  proposedMeasures?: unknown;
}

async function fetchItemOwned(itemId: string, professionalId: string) {
  const item = await db.riskInventoryItem.findUnique({
    where: { id: itemId },
    include: { assessment: true },
  });
  if (!item) return null;
  await requireTenantOwnership(item.assessment.professionalId, professionalId);
  return item;
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { itemId } = await params;
    const item = await fetchItemOwned(itemId, professional.id);
    if (!item) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Risk inventory item not found");
    }

    const body = (await request.json()) as PatchBody;
    const data: {
      hazardDescription?: string;
      possibleHarms?: string;
      probability?: number;
      severity?: number;
      existingControls?: string | null;
      proposedMeasures?: string | null;
    } = {};

    if (body.hazardDescription !== undefined) {
      if (typeof body.hazardDescription !== "string" || body.hazardDescription.trim().length < 3) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "hazardDescription min 3 chars");
      }
      data.hazardDescription = body.hazardDescription.trim();
    }
    if (body.possibleHarms !== undefined) {
      if (typeof body.possibleHarms !== "string" || body.possibleHarms.trim().length < 3) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "possibleHarms min 3 chars");
      }
      data.possibleHarms = body.possibleHarms.trim();
    }
    if (body.probability !== undefined) {
      if (
        typeof body.probability !== "number" ||
        !Number.isInteger(body.probability) ||
        body.probability < 1 ||
        body.probability > 3
      ) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "probability must be 1..3");
      }
      data.probability = body.probability;
    }
    if (body.severity !== undefined) {
      if (
        typeof body.severity !== "number" ||
        !Number.isInteger(body.severity) ||
        body.severity < 1 ||
        body.severity > 3
      ) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "severity must be 1..3");
      }
      data.severity = body.severity;
    }
    if (body.existingControls !== undefined) {
      data.existingControls =
        typeof body.existingControls === "string" && body.existingControls.trim()
          ? body.existingControls.trim()
          : null;
    }
    if (body.proposedMeasures !== undefined) {
      data.proposedMeasures =
        typeof body.proposedMeasures === "string" && body.proposedMeasures.trim()
          ? body.proposedMeasures.trim()
          : null;
    }

    const updated = await db.riskInventoryItem.update({
      where: { id: item.id },
      data,
      include: { department: { select: { name: true } } },
    });
    db.auditLog.create({
      data: {
        professionalId: professional.id,
        action: "inventory.update",
        resourceType: "inventory",
        resourceId: updated.id,
        metadataJson: JSON.stringify({ fields: Object.keys(body) }),
      },
    }).catch(() => {});
    return jsonResponse({
      id: updated.id,
      assessmentId: updated.assessmentId,
      assessmentDepartmentId: updated.assessmentDepartmentId,
      departmentId: updated.departmentId,
      departmentName: updated.department?.name ?? null,
      dimensionCode: updated.dimensionCode,
      mteFactorCode: updated.mteFactorCode,
      isManual: updated.isManual,
      hazardDescription: updated.hazardDescription,
      possibleHarms: updated.possibleHarms,
      probability: updated.probability,
      severity: updated.severity,
      existingControls: updated.existingControls,
      proposedMeasures: updated.proposedMeasures,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[risk-inventory-item PATCH]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { itemId } = await params;
    const item = await fetchItemOwned(itemId, professional.id);
    if (!item) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Risk inventory item not found");
    }
    if (!item.isManual) {
      return errorJson(ERROR_CODES.ITEM_NOT_MANUAL, "Automatic items cannot be deleted");
    }
    await db.riskInventoryItem.delete({ where: { id: item.id } });
    db.auditLog.create({
      data: {
        professionalId: professional.id,
        action: "inventory.delete",
        resourceType: "inventory",
        resourceId: item.id,
        metadataJson: JSON.stringify({}),
      },
    }).catch(() => {});
    return jsonResponse({ ok: true });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[risk-inventory-item DELETE]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
