import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
} from "@/lib/session";
import { runScoring } from "@/lib/scoring-service";

/**
 * POST /api/v1/system/run-pending-scoring
 * RB-06 (spec §3.13): scoring de assessments em status 'processing'.
 * Finds all assessments stuck in 'processing' status and runs scoring on them.
 *
 * Intended to be called by a scheduled cron job (hourly, offset 5 min from RB-07).
 */
export async function POST() {
  try {
    await requireProfessional();

    const pending = await db.assessment.findMany({
      where: { status: "processing" },
      select: { id: true, title: true },
    });

    const results: Array<{
      id: string;
      title: string;
      status: string;
      eligibleDepts: number;
      totalDimensions: number;
      error?: string;
    }> = [];

    for (const a of pending) {
      try {
        const scoringResult = await runScoring(a.id);
        await db.assessment.update({
          where: { id: a.id },
          data: { status: "completed", completedAt: new Date() },
        });
        results.push({
          id: a.id,
          title: a.title,
          status: "completed",
          eligibleDepts: scoringResult.eligibleDepts,
          totalDimensions: scoringResult.totalDimensions,
        });
      } catch (err) {
        results.push({
          id: a.id,
          title: a.title,
          status: "error",
          eligibleDepts: 0,
          totalDimensions: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return jsonResponse({
      processed: results.length,
      results,
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[system/run-pending-scoring POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
