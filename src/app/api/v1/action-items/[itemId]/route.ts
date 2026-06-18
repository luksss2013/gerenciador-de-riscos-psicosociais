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

const VALID_STATUSES = ["pending", "in_progress", "completed", "cancelled"];

async function fetchItemOwned(itemId: string, professionalId: string) {
  const item = await db.actionItem.findUnique({
    where: { id: itemId },
    include: { actionPlan: { include: { assessment: true } } },
  });
  if (!item) return null;
  await requireTenantOwnership(item.actionPlan.assessment.professionalId, professionalId);
  return item;
}

interface PatchBody {
  what?: unknown;
  why?: unknown;
  who?: unknown;
  where?: unknown;
  whenDate?: unknown;
  how?: unknown;
  estimatedCost?: unknown;
  status?: unknown;
  departmentId?: unknown;
  dimensionCode?: unknown;
  riskLevelTrigger?: unknown;
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { itemId } = await params;
    const item = await fetchItemOwned(itemId, professional.id);
    if (!item) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Action item not found");
    }

    const body = (await request.json()) as PatchBody;
    const data: {
      what?: string;
      why?: string;
      who?: string;
      where?: string;
      whenDate?: Date;
      how?: string;
      estimatedCost?: number | null;
      status?: string;
      departmentId?: string | null;
      dimensionCode?: string | null;
      riskLevelTrigger?: string | null;
    } = {};

    if (body.what !== undefined) {
      if (typeof body.what !== "string" || body.what.trim().length < 3) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "what min 3 chars");
      }
      data.what = body.what.trim();
    }
    if (body.why !== undefined) {
      if (typeof body.why !== "string" || body.why.trim().length < 3) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "why min 3 chars");
      }
      data.why = body.why.trim();
    }
    if (body.who !== undefined) {
      if (typeof body.who !== "string" || body.who.trim().length < 2) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "who min 2 chars");
      }
      data.who = body.who.trim();
    }
    if (body.where !== undefined) {
      if (typeof body.where !== "string" || body.where.trim().length < 2) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "where min 2 chars");
      }
      data.where = body.where.trim();
    }
    if (body.how !== undefined) {
      if (typeof body.how !== "string" || body.how.trim().length < 3) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "how min 3 chars");
      }
      data.how = body.how.trim();
    }
    if (body.whenDate !== undefined) {
      if (typeof body.whenDate !== "string") {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "whenDate invalid");
      }
      const d = new Date(body.whenDate);
      if (Number.isNaN(d.getTime())) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "whenDate invalid");
      }
      data.whenDate = d;
    }
    if (body.estimatedCost !== undefined) {
      data.estimatedCost =
        typeof body.estimatedCost === "number" && body.estimatedCost >= 0
          ? body.estimatedCost
          : null;
    }
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !VALID_STATUSES.includes(body.status)) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "status invalid");
      }
      data.status = body.status;
    }
    if (body.departmentId !== undefined) {
      data.departmentId =
        typeof body.departmentId === "string" && body.departmentId ? body.departmentId : null;
    }
    if (body.dimensionCode !== undefined) {
      data.dimensionCode =
        typeof body.dimensionCode === "string" && /^D\d{1,2}$/.test(body.dimensionCode)
          ? body.dimensionCode
          : null;
    }
    if (body.riskLevelTrigger !== undefined) {
      data.riskLevelTrigger =
        typeof body.riskLevelTrigger === "string" &&
        ["LOW", "MEDIUM", "HIGH"].includes(body.riskLevelTrigger)
          ? body.riskLevelTrigger
          : null;
    }

    const updated = await db.actionItem.update({
      where: { id: item.id },
      data,
      include: { department: { select: { name: true } } },
    });
    db.auditLog
      .create({
        data: {
          professionalId: professional.id,
          action: "action_item.update",
          resourceType: "action_item",
          resourceId: updated.id,
          metadataJson: JSON.stringify({
            fields: Object.keys(body),
            ...(typeof body.status === "string" ? { status: body.status } : {}),
          }),
        },
      })
      .catch(() => {});
    return jsonResponse({
      id: updated.id,
      actionPlanId: updated.actionPlanId,
      departmentId: updated.departmentId,
      departmentName: updated.department?.name ?? null,
      dimensionCode: updated.dimensionCode,
      riskLevelTrigger: updated.riskLevelTrigger,
      what: updated.what,
      why: updated.why,
      who: updated.who,
      where: updated.where,
      whenDate: updated.whenDate,
      how: updated.how,
      estimatedCost: updated.estimatedCost,
      status: updated.status,
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
    console.error("[action-item PATCH]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { itemId } = await params;
    const item = await fetchItemOwned(itemId, professional.id);
    if (!item) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Action item not found");
    }
    await db.actionItem.delete({ where: { id: item.id } });
    db.auditLog
      .create({
        data: {
          professionalId: professional.id,
          action: "action_item.delete",
          resourceType: "action_item",
          resourceId: item.id,
          metadataJson: JSON.stringify({}),
        },
      })
      .catch(() => {});
    return jsonResponse({ ok: true });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[action-item DELETE]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
