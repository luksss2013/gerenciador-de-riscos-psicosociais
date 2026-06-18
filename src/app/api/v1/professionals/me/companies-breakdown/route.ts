import { COPSOQ_DIMENSIONS, type DimensionCode } from "@/lib/copsoq-data";
import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  classifyRiskScore,
  companyWeightedAverage,
  type DimensionScoreResult,
} from "@/lib/scoring";
import { errorJson, jsonResponse, requireProfessional } from "@/lib/session";

// Per-company breakdown for the cross-company consolidated analytics view.
//
// Mirrors the professional dashboard's aggregation pattern (single
// `db.company.findMany` with nested includes) but produces per-company
// metrics instead of consolidated totals. See Task 8-a worklog for the
// dashboard's aggregation reference.

interface CompanyDimensionEntry {
  code: string;
  weightedAvgRiskScore: number;
  riskLevel: string;
}

interface CompanyBreakdownEntry {
  companyId: string;
  companyName: string;
  cnpj: string;
  city: string | null;
  state: string | null;
  assessmentsCount: number;
  lastAssessmentStatus: string | null;
  lastAssessmentCompletedAt: string | null;
  eligibleGhes: number;
  totalRespondents: number;
  atRiskGhes: number;
  mediumRiskGhes: number;
  dimensions: CompanyDimensionEntry[];
  overallRiskScore: number;
  overallRiskLevel: string;
}

export async function GET() {
  try {
    const professional = await requireProfessional();

    const companies = await db.company.findMany({
      where: { professionalId: professional.id, isActive: true },
      orderBy: { name: "asc" },
      include: {
        departments: { where: { isActive: true } },
        assessments: {
          include: {
            departments: { include: { dimensionResults: true } },
          },
        },
      },
    });

    const data: CompanyBreakdownEntry[] = companies.map((company) => {
      const companyAssessments = company.assessments;

      // Last assessment = most recent by createdAt (mirrors companies list).
      let lastAssessment: {
        status: string;
        completedAt: Date | null;
        createdAt: Date;
      } | null = null;
      for (const a of companyAssessments) {
        if (!lastAssessment || a.createdAt.getTime() > lastAssessment.createdAt.getTime()) {
          lastAssessment = {
            status: a.status,
            completedAt: a.completedAt,
            createdAt: a.createdAt,
          };
        }
      }

      // Tally metrics across all AssessmentDepartments.
      let eligibleGhes = 0;
      let totalRespondents = 0;
      let atRiskGhes = 0;
      let mediumRiskGhes = 0;

      // Per-dept scoring payloads — only completed assessments contribute to
      // the company-level weighted average.
      const perDeptForAvg: { nResponses: number; results: DimensionScoreResult[] }[] = [];

      for (const a of companyAssessments) {
        for (const ad of a.departments) {
          totalRespondents += ad.responseCount;
          if (!ad.isEligible) continue;
          eligibleGhes += 1;

          // Risk tally (HIGH/MEDIUM) — only on completed assessments, since
          // dimensionResults are only populated after the score step.
          if (a.status === "completed") {
            const hasHigh = ad.dimensionResults.some((r) => r.riskLevel === "HIGH");
            const hasMed = ad.dimensionResults.some((r) => r.riskLevel === "MEDIUM");
            if (hasHigh) atRiskGhes += 1;
            else if (hasMed) mediumRiskGhes += 1;

            // Build DimensionScoreResult payloads for the weighted avg.
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
          }
        }
      }

      // Company-level weighted average per dimension (Passo 6).
      const companyAvgRaw = companyWeightedAverage(perDeptForAvg);
      const dimensions: CompanyDimensionEntry[] = COPSOQ_DIMENSIONS.map((dim) => {
        const r = companyAvgRaw.find((x) => x.code === dim.code);
        return {
          code: dim.code as DimensionCode,
          weightedAvgRiskScore: r?.weightedAvg ?? 0,
          riskLevel: r?.riskLevel ?? "LOW",
        };
      });

      const overallRiskScore = dimensions.length
        ? dimensions.reduce((s, d) => s + d.weightedAvgRiskScore, 0) / dimensions.length
        : 0;
      const overallRiskLevel = classifyRiskScore(overallRiskScore);

      return {
        companyId: company.id,
        companyName: company.name,
        cnpj: company.cnpj,
        city: company.city,
        state: company.state,
        assessmentsCount: companyAssessments.length,
        lastAssessmentStatus: lastAssessment?.status ?? null,
        lastAssessmentCompletedAt: lastAssessment?.completedAt
          ? lastAssessment.completedAt.toISOString()
          : null,
        eligibleGhes,
        totalRespondents,
        atRiskGhes,
        mediumRiskGhes,
        dimensions,
        overallRiskScore: Math.round(overallRiskScore * 100) / 100,
        overallRiskLevel,
      };
    });

    return jsonResponse({ data });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[companies-breakdown GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
