import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";
import {
  companyWeightedAverage,
  DimensionScoreResult,
} from "@/lib/scoring";
import { COPSOQ_DIMENSIONS, DimensionCode } from "@/lib/copsoq-data";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        departments: {
          include: {
            department: true,
            dimensionResults: true,
            responseTokens: { where: { isUsed: true }, select: { id: true } },
          },
        },
      },
    });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    if (assessment.status !== "completed") {
      return errorJson(
        ERROR_CODES.ASSESSMENT_NOT_COMPLETED,
        "Assessment must be completed to view dashboard"
      );
    }

    // Build heatmap
    const heatmap: Array<{
      deptId: string;
      deptName: string;
      nResponses: number;
      isEligible: boolean;
      dimensions:
        | Array<{
            code: string;
            rawScore: number;
            riskScore: number;
            riskLevel: string;
            cronbachAlpha: number | null;
            nResponses: number;
          }>
        | null;
    }> = [];

    const perDeptForAvg: { nResponses: number; results: DimensionScoreResult[] }[] = [];
    let totalRespondents = 0;
    let ghesHighRisk = 0;
    let ghesMediumRisk = 0;
    let ghesIneligible = 0;
    let sumExpected = 0;
    let sumResponded = 0;

    for (const ad of assessment.departments) {
      sumExpected += ad.expectedResponses;
      sumResponded += ad.responseCount;
      totalRespondents += ad.responseCount;

      if (!ad.isEligible) {
        ghesIneligible += 1;
        heatmap.push({
          deptId: ad.id,
          deptName: ad.department.name,
          nResponses: ad.responseCount,
          isEligible: false,
          dimensions: null, // RB-03
        });
        continue;
      }

      // Map DimensionResult rows into DimensionScoreResult shape for companyWeightedAverage
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

      perDeptForAvg.push({ nResponses: ad.responseCount, results });

      const hasHigh = results.some((r) => r.riskLevel === "HIGH");
      const hasMed = results.some((r) => r.riskLevel === "MEDIUM");
      if (hasHigh) ghesHighRisk += 1;
      else if (hasMed) ghesMediumRisk += 1;

      heatmap.push({
        deptId: ad.id,
        deptName: ad.department.name,
        nResponses: ad.responseCount,
        isEligible: true,
        dimensions: ad.dimensionResults.map((r) => ({
          code: r.dimensionCode,
          rawScore: r.rawScore,
          riskScore: r.riskScore,
          riskLevel: r.riskLevel,
          cronbachAlpha: r.cronbachAlpha,
          nResponses: r.nResponses,
        })),
      });
    }

    const globalAdesao = sumExpected > 0
      ? Math.round((sumResponded / sumExpected) * 100)
      : 0;

    const companyAvgRaw = companyWeightedAverage(perDeptForAvg);
    const companyAvg = companyAvgRaw.map((r) => ({
      code: r.code as DimensionCode,
      weightedAvgRiskScore: r.weightedAvg,
      riskLevel: r.riskLevel,
    }));

    // Critical dimensions: companyAvg riskLevel=HIGH, sorted by avgRiskScore desc
    const criticalDimensions = companyAvg
      .filter((c) => c.riskLevel === "HIGH")
      .sort((a, b) => b.weightedAvgRiskScore - a.weightedAvgRiskScore)
      .map((c) => {
        const dim = COPSOQ_DIMENSIONS.find((d) => d.code === c.code)!;
        const affectedDepts = assessment.departments
          .filter((ad) => ad.isEligible && ad.dimensionResults.some(
            (r) => r.dimensionCode === c.code && r.riskLevel === "HIGH"
          ))
          .map((ad) => ad.id);
        return {
          code: c.code,
          name: dim.namePtBr,
          avgRiskScore: c.weightedAvgRiskScore,
          affectedDepts,
        };
      });

    return jsonResponse({
      kpis: {
        globalAdesao,
        ghesHighRisk,
        ghesMediumRisk,
        ghesIneligible,
        totalRespondents,
      },
      heatmap,
      companyAvg,
      criticalDimensions,
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[dashboard GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
