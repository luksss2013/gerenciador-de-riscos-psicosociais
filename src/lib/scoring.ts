// COPSOQ II-BR Scoring Engine — spec §1.4, deterministic & idempotent (RB-06).
//
// Passo 1: s_item(r) = (r - 1) / 4 * 100         → {1:0, 2:25, 3:50, 4:75, 5:100}
// Passo 2: s_bruto(D,g) = mean of all item-scores × all respondents
// Passo 3: s_risco(D,g) = s_bruto if DIRECT else 100 - s_bruto
// Passo 4: riskLevel: [0,33]=LOW  [34,66]=MEDIUM  [67,100]=HIGH
// Passo 5: Cronbach's α (k>=2); null for k=1 (D11)
// Passo 6: s_empresa(D) = weighted by N_g over eligible GHEs (k>=5)

import {
  COPSOQ_DIMENSIONS,
  COPSOQ_ITEMS,
  DimensionCode,
  Direction,
  getDimension,
  RiskLevel,
} from "./copsoq-data";

export const K_ANONYMITY_THRESHOLD = 5; // RB-10, §1.7

/** Passo 1 — Convert Likert (1..5) to item score [0,100]. */
export function likertToItemScore(r: number): number {
  return ((r - 1) / 4) * 100;
}

/** Passo 4 — Classify riskScore [0,100] → LOW/MEDIUM/HIGH. */
export function classifyRiskScore(score: number): RiskLevel {
  if (score <= 33) return "LOW";
  if (score <= 66) return "MEDIUM";
  return "HIGH";
}

/** Passo 3 — Apply direction to get risk score from raw score. */
export function applyDirection(rawScore: number, direction: Direction): number {
  return direction === "INVERTED" ? 100 - rawScore : rawScore;
}

/** Passo 5 — Cronbach's α for k items × N respondents.
 *  itemScores[i] = array of item-scores (0..100) for item i, length N.
 *  Returns null if k < 2. NaN-safe. */
export function cronbachAlpha(itemScores: number[][]): number | null {
  const k = itemScores.length;
  if (k < 2) return null;
  // Need at least 2 respondents with variance
  const N = itemScores[0]?.length ?? 0;
  if (N < 2) return null;

  // Sum per respondent across items
  const respondentSums: number[] = new Array(N).fill(0);
  const itemVariances: number[] = [];

  for (const scores of itemScores) {
    if (scores.length !== N) return null;
    const mean = scores.reduce((a, b) => a + b, 0) / N;
    const variance =
      scores.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (N - 1);
    itemVariances.push(variance);
    scores.forEach((v, j) => (respondentSums[j] += v));
  }

  const sumMean = respondentSums.reduce((a, b) => a + b, 0) / N;
  const sumVariance =
    respondentSums.reduce((acc, v) => acc + (v - sumMean) ** 2, 0) / (N - 1);

  if (sumVariance === 0) return 0;
  const alpha = (k / (k - 1)) * (1 - itemVariances.reduce((a, b) => a + b, 0) / sumVariance);
  // Clamp to [0,1] numerically; can dip slightly negative in pathological data
  return Math.max(0, Math.min(1, alpha));
}

export interface AnswerMatrixEntry {
  itemIndex: number;
  likertValue: number;
}

export interface DimensionScoreResult {
  dimensionCode: DimensionCode;
  rawScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  cronbachAlpha: number | null;
  nResponses: number;
  direction: Direction;
}

/** Score one assessment_department (GHE) over its used tokens.
 *  `answersByToken` = array of tokens, each = array of {itemIndex, likertValue}.
 *  Returns null when GHE ineligible (nResponses < k threshold). */
export function scoreDepartment(
  answersByToken: AnswerMatrixEntry[][]
): DimensionScoreResult[] | null {
  const nResponses = answersByToken.length;
  if (nResponses < K_ANONYMITY_THRESHOLD) return null; // RB-10

  const results: DimensionScoreResult[] = [];

  for (const dim of COPSOQ_DIMENSIONS) {
    const itemsInDim = COPSOQ_ITEMS.filter((i) => i.dimensionCode === dim.code);
    // itemScores[i] = array of N respondent scores for item i
    const itemScores: number[][] = itemsInDim.map((item) => {
      return answersByToken.map((tokenAnswers) => {
        const a = tokenAnswers.find((x) => x.itemIndex === item.index);
        return a ? likertToItemScore(a.likertValue) : 0; // missing = 0 (Likert 1)
      });
    });

    // rawScore = mean over all item-scores × respondents
    const allScores = itemScores.flat();
    const rawScore = allScores.length
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

    const riskScore = applyDirection(rawScore, dim.direction);
    const riskLevel = classifyRiskScore(riskScore);
    const alpha = cronbachAlpha(itemScores);

    results.push({
      dimensionCode: dim.code,
      rawScore: round2(rawScore),
      riskScore: round2(riskScore),
      riskLevel,
      cronbachAlpha: alpha !== null ? round3(alpha) : null,
      nResponses,
      direction: dim.direction,
    });
  }

  return results;
}

/** Passo 6 — Company-level weighted average per dimension over eligible GHEs. */
export function companyWeightedAverage(
  perDept: { nResponses: number; results: DimensionScoreResult[] }[]
): { code: DimensionCode; weightedAvg: number; riskLevel: RiskLevel }[] {
  const eligible = perDept.filter((d) => d.nResponses >= K_ANONYMITY_THRESHOLD);
  const totalWeight = eligible.reduce((s, d) => s + d.nResponses, 0) || 1;

  return COPSOQ_DIMENSIONS.map((dim) => {
    let acc = 0;
    for (const d of eligible) {
      const r = d.results.find((x) => x.dimensionCode === dim.code);
      if (r) acc += r.riskScore * d.nResponses;
    }
    const weightedAvg = round2(acc / totalWeight);
    return {
      code: dim.code,
      weightedAvg,
      riskLevel: classifyRiskScore(weightedAvg),
    };
  });
}

/** NR-1 inventory matrix (spec §1.5): P × S → LOW/MEDIUM/HIGH. */
export function classifyInventoryRisk(probability: number, severity: number): {
  level: RiskLevel;
  score: number;
} {
  const score = probability * severity; // 1..9
  let level: RiskLevel;
  if (score <= 2) level = "LOW";
  else if (score <= 4) level = "MEDIUM";
  else level = "HIGH"; // 6,9
  return { level, score };
}

/** Default P/S for inventory auto-items from COPSOQ risk_level (spec §1.5). */
export function defaultInventoryPS(riskLevel: RiskLevel): {
  probability: number;
  severity: number;
} {
  switch (riskLevel) {
    case "HIGH":
      return { probability: 3, severity: 3 };
    case "MEDIUM":
      return { probability: 2, severity: 2 };
    default:
      return { probability: 1, severity: 1 };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
