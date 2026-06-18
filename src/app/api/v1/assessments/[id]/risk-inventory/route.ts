import { COPSOQ_DIMENSIONS, type DimensionCode, INVENTORY_TEMPLATES } from "@/lib/copsoq-data";
import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { defaultInventoryPS } from "@/lib/scoring";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

function serializeItem(i: {
  id: string;
  assessmentId: string;
  assessmentDepartmentId: string | null;
  departmentId: string | null;
  department?: { name: string } | null;
  dimensionCode: string | null;
  mteFactorCode: string | null;
  isManual: boolean;
  hazardDescription: string;
  possibleHarms: string;
  probability: number;
  severity: number;
  existingControls: string | null;
  proposedMeasures: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: i.id,
    assessmentId: i.assessmentId,
    assessmentDepartmentId: i.assessmentDepartmentId,
    departmentId: i.departmentId,
    departmentName: i.department?.name ?? null,
    dimensionCode: i.dimensionCode,
    mteFactorCode: i.mteFactorCode,
    isManual: i.isManual,
    hazardDescription: i.hazardDescription,
    possibleHarms: i.possibleHarms,
    probability: i.probability,
    severity: i.severity,
    existingControls: i.existingControls,
    proposedMeasures: i.proposedMeasures,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        departments: {
          include: { dimensionResults: true, department: true },
        },
      },
    });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    // Auto-generate on first call (idempotent):
    // For each eligible AssessmentDept × each DimensionResult with riskLevel IN (MEDIUM, HIGH),
    // create RiskInventoryItem (isManual=false) — skip if item already exists.
    const validDimCodes = new Set(COPSOQ_DIMENSIONS.map((d) => d.code));
    const existingAuto = await db.riskInventoryItem.findMany({
      where: { assessmentId: assessment.id, isManual: false },
      select: {
        assessmentDepartmentId: true,
        dimensionCode: true,
      },
    });
    const existingKey = new Set(
      existingAuto
        .filter((e) => e.assessmentDepartmentId && e.dimensionCode)
        .map((e) => `${e.assessmentDepartmentId}|${e.dimensionCode}`),
    );

    const toCreate: {
      assessmentId: string;
      assessmentDepartmentId: string;
      departmentId: string;
      dimensionCode: string;
      mteFactorCode: string;
      hazardDescription: string;
      possibleHarms: string;
      probability: number;
      severity: number;
      isManual: boolean;
    }[] = [];

    for (const ad of assessment.departments) {
      if (!ad.isEligible) continue;
      for (const dr of ad.dimensionResults) {
        if (!validDimCodes.has(dr.dimensionCode as DimensionCode)) continue;
        if (dr.riskLevel !== "MEDIUM" && dr.riskLevel !== "HIGH") continue;
        const key = `${ad.id}|${dr.dimensionCode}`;
        if (existingKey.has(key)) continue;
        const template = INVENTORY_TEMPLATES[dr.dimensionCode as DimensionCode];
        const ps = defaultInventoryPS(dr.riskLevel as "MEDIUM" | "HIGH");
        toCreate.push({
          assessmentId: assessment.id,
          assessmentDepartmentId: ad.id,
          departmentId: ad.departmentId,
          dimensionCode: dr.dimensionCode,
          mteFactorCode: template.mteFactorCode,
          hazardDescription: template.hazardDescription,
          possibleHarms: template.possibleHarms,
          probability: ps.probability,
          severity: ps.severity,
          isManual: false,
        });
        existingKey.add(key);
      }
    }

    if (toCreate.length > 0) {
      await db.riskInventoryItem.createMany({ data: toCreate });
    }

    const allItems = await db.riskInventoryItem.findMany({
      where: { assessmentId: assessment.id },
      include: { department: { select: { name: true } } },
      orderBy: [{ isManual: "asc" }, { createdAt: "asc" }],
    });

    return jsonResponse({
      autoItems: allItems.filter((i) => !i.isManual).map(serializeItem),
      manualItems: allItems.filter((i) => i.isManual).map(serializeItem),
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[risk-inventory GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
