// Scoring service — orchestrates per-GHE scoring + persistence (spec §3.8, RB-06).
// Idempotent: deletes & re-inserts DimensionResult rows on each run.

import { db } from "./db";
import {
  AnswerMatrixEntry,
  DimensionScoreResult,
  K_ANONYMITY_THRESHOLD,
  scoreDepartment,
} from "./scoring";
import { COPSOQ_DIMENSIONS, DimensionCode } from "./copsoq-data";

export interface RunScoringResult {
  eligibleDepts: number;
  totalDimensions: number;
}

/**
 * Run scoring for an assessment.
 * 1. Fetch all AssessmentDepartments.
 * 2. For each, fetch used ResponseTokens + their ResponseAnswers.
 * 3. Build answersByToken matrix (one array per token).
 * 4. Call scoreDepartment().
 * 5. If ineligible (null) → mark isEligible=false, DELETE existing DimensionResults.
 * 6. Else → upsert DimensionResult rows, mark isEligible=true.
 * 7. Return { eligibleDepts, totalDimensions }.
 */
export async function runScoring(
  assessmentId: string
): Promise<RunScoringResult> {
  const assessmentDepartments = await db.assessmentDepartment.findMany({
    where: { assessmentId },
    include: {
      responseTokens: {
        where: { isUsed: true },
        include: { answers: true },
      },
    },
  });

  let eligibleDepts = 0;
  const totalDimensions = COPSOQ_DIMENSIONS.length;

  for (const ad of assessmentDepartments) {
    const answersByToken: AnswerMatrixEntry[][] = ad.responseTokens.map(
      (tok) =>
        tok.answers.map((a) => ({
          itemIndex: a.itemIndex,
          likertValue: a.likertValue,
        }))
    );

    const nResponses = answersByToken.length;
    const results: DimensionScoreResult[] | null =
      scoreDepartment(answersByToken);

    if (results === null) {
      // Ineligible: nResponses < K_ANONYMITY_THRESHOLD
      await db.$transaction([
        db.assessmentDepartment.update({
          where: { id: ad.id },
          data: {
            isEligible: false,
            responseCount: nResponses,
          },
        }),
        db.dimensionResult.deleteMany({
          where: { assessmentDepartmentId: ad.id },
        }),
      ]);
      continue;
    }

    eligibleDepts += 1;

    // Upsert dimension results (delete-then-insert for SQLite idempotency)
    await db.dimensionResult.deleteMany({
      where: { assessmentDepartmentId: ad.id },
    });

    await db.dimensionResult.createMany({
      data: results.map((r) => ({
        assessmentDepartmentId: ad.id,
        dimensionCode: r.dimensionCode,
        rawScore: r.rawScore,
        riskScore: r.riskScore,
        riskLevel: r.riskLevel,
        cronbachAlpha: r.cronbachAlpha,
        nResponses: r.nResponses,
      })),
    });

    await db.assessmentDepartment.update({
      where: { id: ad.id },
      data: {
        isEligible: true,
        responseCount: nResponses,
      },
    });
  }

  return { eligibleDepts, totalDimensions };
}
