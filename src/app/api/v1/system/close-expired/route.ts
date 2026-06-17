import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
} from "@/lib/session";
import { runScoring } from "@/lib/scoring-service";

/**
 * POST /api/v1/system/close-expired
 * RB-07 (spec §1.8): auto-close assessments where endDate < today AND status = 'collecting'.
 * For each, sets status → 'processing', runs scoring synchronously, then status → 'completed'.
 *
 * This endpoint is intended to be called by a scheduled cron job (every hour).
 * It requires an authenticated professional session (the cron job authenticates
 * via the session cookie). In a production deployment this would be a system_admin
 * role or a dedicated API key; in the sandbox it reuses the session layer.
 */
export async function POST() {
  try {
    // Require auth — the scheduled caller holds a session.
    await requireProfessional();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all collecting assessments past their endDate (or with no endDate but
    // createdAt > 90 days ago as a safety net).
    const expired = await db.assessment.findMany({
      where: {
        status: "collecting",
        OR: [
          { endDate: { lt: today } },
          {
            endDate: null,
            createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
        ],
      },
      select: { id: true, title: true },
    });

    const results: Array<{ id: string; title: string; status: string; eligibleDepts: number; totalDimensions: number; error?: string }> = [];

    for (const a of expired) {
      try {
        // Set to processing
        await db.assessment.update({
          where: { id: a.id },
          data: { status: "processing" },
        });
        // Run scoring synchronously (sandbox — production would queue a job)
        const scoringResult = await runScoring(a.id);
        // Set to completed
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
        // If scoring fails, revert to collecting so it can be retried.
        await db.assessment.update({
          where: { id: a.id },
          data: { status: "collecting" },
        }).catch(() => {});
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
    console.error("[system/close-expired POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
