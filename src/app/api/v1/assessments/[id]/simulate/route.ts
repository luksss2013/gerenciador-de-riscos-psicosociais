import { randomUUID } from "crypto";

import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";
import {
  COPSOQ_DIMENSIONS,
  COPSOQ_ITEMS,
  type Direction,
} from "@/lib/copsoq-data";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

interface SimulateBody {
  count?: unknown;
  assessmentDeptId?: unknown;
  bias?: unknown;
}

type Bias = "low" | "medium" | "high";

// ─── Gaussian random helpers ─────────────────────────────────────────────────

function gaussian(mean: number, std: number): number {
  // Box-Muller transform
  const u1 = Math.max(Math.random(), Number.EPSILON); // avoid log(0)
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function biasedLikert(direction: Direction, bias: Bias): number {
  // For DIRECT dimensions: high Likert = high risk. So "high" bias → high Likert.
  // For INVERTED dimensions: low Likert = high risk. So "high" bias → low Likert.
  let mean: number;
  if (bias === "high") mean = direction === "DIRECT" ? 4.0 : 2.0;
  else if (bias === "low") mean = direction === "DIRECT" ? 2.0 : 4.0;
  else mean = 3.0; // medium
  const val = Math.round(gaussian(mean, 0.9));
  return Math.max(1, Math.min(5, val));
}

// Pre-compute each item's dimension direction once for the 40 items.
const ITEM_DIRECTIONS: Direction[] = COPSOQ_ITEMS.map((item) => {
  const dim = COPSOQ_DIMENSIONS.find((d) => d.code === item.dimensionCode);
  if (!dim) {
    throw new Error(
      `Missing dimension ${item.dimensionCode} for item ${item.index}`,
    );
  }
  return dim.direction;
});

export async function POST(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;

    // Fetch assessment + its AssessmentDepartment rows (we need the dept name
    // from the related Department for the response payload).
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        departments: { include: { department: true } },
      },
    });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    if (assessment.status !== "collecting") {
      return errorJson(
        ERROR_CODES.ASSESSMENT_NOT_COLLECTING,
        "Assessment must be collecting to simulate responses",
      );
    }

    // Parse + validate body
    let body: SimulateBody = {};
    try {
      body = (await request.json()) as SimulateBody;
    } catch {
      // No body or malformed JSON — defaults below.
    }

    const providedDeptId =
      typeof body.assessmentDeptId === "string" &&
      body.assessmentDeptId.trim().length > 0
        ? body.assessmentDeptId.trim()
        : null;

    // Validate count: integer 1-50, default 5.
    let count = 5;
    if (body.count !== undefined) {
      const n = typeof body.count === "number" ? body.count : NaN;
      if (
        !Number.isFinite(n) ||
        !Number.isInteger(n) ||
        n < 1 ||
        n > 50
      ) {
        return errorJson(
          ERROR_CODES.VALIDATION_ERROR,
          "count must be an integer between 1 and 50",
          { field: "count" },
        );
      }
      count = n;
    }
    // If no assessmentDeptId is provided, count is required (per spec); we
    // apply the default of 5 when omitted, which also satisfies the requirement.

    // Validate bias: low | medium | high, default medium.
    let bias: Bias = "medium";
    if (body.bias !== undefined && body.bias !== null) {
      if (
        body.bias !== "low" &&
        body.bias !== "medium" &&
        body.bias !== "high"
      ) {
        return errorJson(
          ERROR_CODES.VALIDATION_ERROR,
          'bias must be "low", "medium", or "high"',
          { field: "bias" },
        );
      }
      bias = body.bias as Bias;
    }

    // Determine target GHEs.
    const allDepts = assessment.departments;
    if (allDepts.length === 0) {
      return errorJson(
        ERROR_CODES.VALIDATION_ERROR,
        "Assessment has no GHEs to simulate",
      );
    }

    let targetDepts = allDepts;
    if (providedDeptId) {
      const found = allDepts.find((ad) => ad.id === providedDeptId);
      if (!found) {
        return errorJson(
          ERROR_CODES.ASSESSMENT_DEPT_NOT_FOUND,
          "assessmentDeptId does not belong to this assessment",
          { assessmentDeptId: providedDeptId },
        );
      }
      targetDepts = [found];
    }

    // ─── Simulation: one transaction, batched createMany ────────────────────
    //
    // For each target GHE, for `count` iterations:
    //   1. Mint a token (single create() so we know the returned id).
    //   2. createMany the 40 ResponseAnswer rows tied to that token.
    //   3. Mark token as used.
    //   4. After all iterations, increment the AssessmentDepartment's
    //      responseCount by `count` and update isEligible.
    //
    // All of this runs inside a single $transaction for atomicity. Even with
    // 50 responses × 40 items = 2000 answer rows per GHE, the createMany
    // batching keeps SQLite happy.

    const byDeptResults: Array<{
      id: string;
      name: string;
      responseCount: number;
      isEligible: boolean;
    }> = [];

    let simulated = 0;
    const now = new Date();

    await db.$transaction(async (tx) => {
      for (const ad of targetDepts) {
        for (let i = 0; i < count; i++) {
          // Mint a token (need the returned id for the answer rows).
          const token = await tx.responseToken.create({
            data: {
              assessmentDepartmentId: ad.id,
              token: randomUUID(),
            },
          });

          // Batch-create the 40 answers in one createMany.
          const answerRows = COPSOQ_ITEMS.map((item) => ({
            tokenId: token.id,
            itemIndex: item.index,
            likertValue: biasedLikert(
              ITEM_DIRECTIONS[item.index - 1],
              bias,
            ),
          }));
          await tx.responseAnswer.createMany({ data: answerRows });

          // Mark token as used (same shape as the real worker complete flow).
          await tx.responseToken.update({
            where: { id: token.id },
            data: { isUsed: true, usedAt: now },
          });

          simulated += 1;
        }

        // Increment responseCount + recompute isEligible.
        const newCount = ad.responseCount + count;
        await tx.assessmentDepartment.update({
          where: { id: ad.id },
          data: {
            responseCount: newCount,
            isEligible: newCount >= 5,
          },
        });

        byDeptResults.push({
          id: ad.id,
          name: ad.department.name,
          responseCount: newCount,
          isEligible: newCount >= 5,
        });
      }
    });

    // Fire-and-forget audit log — never blocks the response.
    db.auditLog
      .create({
        data: {
          professionalId: professional.id,
          action: "assessment.simulate",
          resourceType: "assessment",
          resourceId: assessment.id,
          metadataJson: JSON.stringify({
            count,
            bias,
            deptCount: targetDepts.length,
          }),
        },
      })
      .catch(() => {});

    return jsonResponse({ simulated, byDept: byDeptResults });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(
        ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS,
        "Cross-tenant access denied",
      );
    }
    console.error("[simulate POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
