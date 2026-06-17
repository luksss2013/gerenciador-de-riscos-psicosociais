import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

interface ManualBody {
  assessmentDepartmentId?: unknown;
  departmentId?: unknown;
  mteFactorCode?: unknown;
  hazardDescription?: unknown;
  possibleHarms?: unknown;
  probability?: unknown;
  severity?: unknown;
  existingControls?: unknown;
  proposedMeasures?: unknown;
}

export async function POST(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const assessment = await db.assessment.findUnique({ where: { id } });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    const body = (await request.json()) as ManualBody;
    const mteFactorCode =
      typeof body.mteFactorCode === "string" && /^F\d{1,2}$/.test(body.mteFactorCode)
        ? body.mteFactorCode
        : "";
    const hazardDescription =
      typeof body.hazardDescription === "string" ? body.hazardDescription.trim() : "";
    const possibleHarms =
      typeof body.possibleHarms === "string" ? body.possibleHarms.trim() : "";
    const probability =
      typeof body.probability === "number" &&
      Number.isInteger(body.probability) &&
      body.probability >= 1 &&
      body.probability <= 3
        ? body.probability
        : 0;
    const severity =
      typeof body.severity === "number" &&
      Number.isInteger(body.severity) &&
      body.severity >= 1 &&
      body.severity <= 3
        ? body.severity
        : 0;

    if (!mteFactorCode) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "mteFactorCode is invalid (F1..F13)");
    }
    if (hazardDescription.length < 3) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "hazardDescription required (min 3 chars)");
    }
    if (possibleHarms.length < 3) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "possibleHarms required (min 3 chars)");
    }
    if (probability < 1 || severity < 1) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "probability and severity must be 1..3");
    }

    const assessmentDepartmentId =
      typeof body.assessmentDepartmentId === "string" && body.assessmentDepartmentId
        ? body.assessmentDepartmentId
        : null;
    const departmentId =
      typeof body.departmentId === "string" && body.departmentId
        ? body.departmentId
        : null;
    const existingControls =
      typeof body.existingControls === "string" && body.existingControls.trim()
        ? body.existingControls.trim()
        : null;
    const proposedMeasures =
      typeof body.proposedMeasures === "string" && body.proposedMeasures.trim()
        ? body.proposedMeasures.trim()
        : null;

    // Validate assessmentDepartment belongs to this assessment, if provided
    if (assessmentDepartmentId) {
      const ad = await db.assessmentDepartment.findUnique({
        where: { id: assessmentDepartmentId },
        select: { assessmentId: true, departmentId: true },
      });
      if (!ad || ad.assessmentId !== assessment.id) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "assessmentDepartmentId invalid for this assessment");
      }
    }

    const item = await db.riskInventoryItem.create({
      data: {
        assessmentId: assessment.id,
        assessmentDepartmentId,
        departmentId,
        mteFactorCode,
        isManual: true,
        hazardDescription,
        possibleHarms,
        probability,
        severity,
        existingControls,
        proposedMeasures,
      },
      include: { department: { select: { name: true } } },
    });

    db.auditLog.create({
      data: {
        professionalId: professional.id,
        action: "inventory.create",
        resourceType: "inventory",
        resourceId: item.id,
        metadataJson: JSON.stringify({ mteFactorCode: item.mteFactorCode, dimensionCode: item.dimensionCode }),
      },
    }).catch(() => {});

    return jsonResponse(
      {
        id: item.id,
        assessmentId: item.assessmentId,
        assessmentDepartmentId: item.assessmentDepartmentId,
        departmentId: item.departmentId,
        departmentName: item.department?.name ?? null,
        dimensionCode: item.dimensionCode,
        mteFactorCode: item.mteFactorCode,
        isManual: item.isManual,
        hazardDescription: item.hazardDescription,
        possibleHarms: item.possibleHarms,
        probability: item.probability,
        severity: item.severity,
        existingControls: item.existingControls,
        proposedMeasures: item.proposedMeasures,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
      201
    );
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[risk-inventory/manual POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
