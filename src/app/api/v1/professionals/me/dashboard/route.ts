import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { errorJson, jsonResponse, requireProfessional } from "@/lib/session";
import {
  companyWeightedAverage,
  DimensionScoreResult,
} from "@/lib/scoring";
import { COPSOQ_DIMENSIONS, DimensionCode } from "@/lib/copsoq-data";

// NR-1: psychosocial risk assessment cycle must be repeated at least every 2 years.
const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 2;

const PT_BR_MONTH_ABBR = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface RecentAssessment {
  id: string;
  title: string;
  status: string;
  companyId: string;
  companyName: string;
  completedAt: string | null;
  updatedAt: string;
}

interface HeatmapEntry {
  code: string;
  name: string;
  weightedAvgRiskScore: number;
  riskLevel: string;
}

interface TrendEntry {
  month: string;
  label: string;
  count: number;
}

export async function GET() {
  try {
    const professional = await requireProfessional();

    const companies = await db.company.findMany({
      where: { professionalId: professional.id, isActive: true },
      include: {
        departments: { where: { isActive: true } },
        assessments: {
          include: {
            departments: { include: { dimensionResults: true } },
          },
        },
      },
    });

    // ─── KPIs ────────────────────────────────────────────────────────────────
    const totalCompanies = companies.length;
    let totalDepartments = 0;
    let totalAssessments = 0;
    let activeAssessments = 0;
    let completedAssessments = 0;
    let totalRespondents = 0;
    let atRiskGhes = 0;
    let mediumRiskGhes = 0;

    // ─── Compliance (independent counters per spec) ──────────────────────────
    let compliant = 0;
    let pendingReview = 0;
    let noAssessment = 0;
    let inProgress = 0;

    // ─── Dimension heatmap aggregation across all completed assessments ──────
    const perDeptForAvg: { nResponses: number; results: DimensionScoreResult[] }[] = [];

    // ─── Recent assessments flat list ────────────────────────────────────────
    const recentFlat: Array<{
      id: string;
      title: string;
      status: string;
      companyId: string;
      companyName: string;
      completedAt: Date | null;
      updatedAt: Date;
      createdAt: Date;
    }> = [];

    // ─── Trend (last 6 months incl current) ──────────────────────────────────
    const now = new Date();
    const trendBuckets: TrendEntry[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${PT_BR_MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
      trendBuckets.push({ month, label, count: 0 });
    }

    for (const company of companies) {
      totalDepartments += company.departments.length;

      const companyAssessments = company.assessments;
      totalAssessments += companyAssessments.length;

      if (companyAssessments.length === 0) {
        noAssessment += 1;
      }

      let hasInProgress = false;
      let lastCompletedAt: Date | null = null;

      for (const a of companyAssessments) {
        if (a.status === "draft" || a.status === "collecting" || a.status === "processing") {
          activeAssessments += 1;
          hasInProgress = true;
        }
        if (a.status === "completed") {
          completedAssessments += 1;
          if (a.completedAt) {
            if (!lastCompletedAt || a.completedAt.getTime() > lastCompletedAt.getTime()) {
              lastCompletedAt = a.completedAt;
            }
          }
        }

        // Respondents + risk tally across AssessmentDepartments
        for (const ad of a.departments) {
          totalRespondents += ad.responseCount;

          if (!ad.isEligible) continue;

          // Eligible GHE — feed into company-weighted average (only completed assessments)
          if (a.status === "completed") {
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

          const hasHigh = ad.dimensionResults.some((r) => r.riskLevel === "HIGH");
          const hasMed = ad.dimensionResults.some((r) => r.riskLevel === "MEDIUM");
          if (hasHigh) atRiskGhes += 1;
          else if (hasMed) mediumRiskGhes += 1;
        }

        recentFlat.push({
          id: a.id,
          title: a.title,
          status: a.status,
          companyId: company.id,
          companyName: company.name,
          completedAt: a.completedAt,
          updatedAt: a.updatedAt,
          createdAt: a.createdAt,
        });

        // Trend: count by createdAt month
        const createdMonth = `${a.createdAt.getFullYear()}-${String(a.createdAt.getMonth() + 1).padStart(2, "0")}`;
        const bucket = trendBuckets.find((b) => b.month === createdMonth);
        if (bucket) bucket.count += 1;
      }

      if (hasInProgress) inProgress += 1;

      if (lastCompletedAt) {
        const age = now.getTime() - lastCompletedAt.getTime();
        if (age < TWO_YEARS_MS) compliant += 1;
        else pendingReview += 1;
      }
    }

    // ─── Recent assessments: top 5 by updatedAt DESC ─────────────────────────
    const recentAssessments: RecentAssessment[] = recentFlat
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        companyId: a.companyId,
        companyName: a.companyName,
        completedAt: a.completedAt ? a.completedAt.toISOString() : null,
        updatedAt: a.updatedAt.toISOString(),
      }));

    // ─── Dimension heatmap (company-weighted avg across all eligible depts
    //     of all completed assessments) ───────────────────────────────────────
    const companyAvgRaw = companyWeightedAverage(perDeptForAvg);
    const dimensionHeatmap: HeatmapEntry[] = COPSOQ_DIMENSIONS.map((dim) => {
      const r = companyAvgRaw.find((x) => x.code === dim.code);
      return {
        code: dim.code as DimensionCode,
        name: dim.namePtBr,
        weightedAvgRiskScore: r?.weightedAvg ?? 0,
        riskLevel: r?.riskLevel ?? "LOW",
      };
    });

    return jsonResponse({
      kpis: {
        totalCompanies,
        totalDepartments,
        totalAssessments,
        activeAssessments,
        completedAssessments,
        totalRespondents,
        atRiskGhes,
        mediumRiskGhes,
      },
      compliance: {
        compliant,
        pendingReview,
        noAssessment,
        inProgress,
      },
      recentAssessments,
      dimensionHeatmap,
      trend: trendBuckets,
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[dashboard GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
