import { COPSOQ_DIMENSIONS, type DimensionCode } from "@/lib/copsoq-data";
import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { companyWeightedAverage, type DimensionScoreResult } from "@/lib/scoring";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const company = await db.company.findUnique({ where: { id } });
    if (!company) {
      return errorJson(ERROR_CODES.COMPANY_NOT_FOUND, "Company not found");
    }
    await requireTenantOwnership(company.professionalId, professional.id);

    const assessments = await db.assessment.findMany({
      where: { companyId: company.id, status: "completed" },
      orderBy: { completedAt: "asc" },
      include: {
        departments: {
          include: { dimensionResults: true },
        },
      },
    });

    const data = assessments.map((a) => {
      const perDept = a.departments
        .filter((ad) => ad.isEligible)
        .map((ad) => {
          const results: DimensionScoreResult[] = COPSOQ_DIMENSIONS.map((dim) => {
            const r = ad.dimensionResults.find((x) => x.dimensionCode === dim.code);
            return {
              dimensionCode: dim.code,
              rawScore: r?.rawScore ?? 0,
              riskScore: r?.riskScore ?? 0,
              riskLevel: (r?.riskLevel ?? "LOW") as "LOW" | "MEDIUM" | "HIGH",
              cronbachAlpha: r?.cronbachAlpha ?? null,
              nResponses: r?.nResponses ?? ad.responseCount,
              direction: dim.direction,
            };
          });
          return { nResponses: ad.responseCount, results };
        });

      const avg = companyWeightedAverage(perDept);
      return {
        assessmentId: a.id,
        title: a.title,
        completedAt: a.completedAt,
        dimensions: avg.map((r) => ({
          code: r.code as DimensionCode,
          avgRiskScore: r.weightedAvg,
        })),
      };
    });

    return jsonResponse(data);
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[trend GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
