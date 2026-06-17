import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
} from "@/lib/session";

/**
 * POST /api/v1/system/cleanup
 * Spec §3.13 — daily cleanup job (04:00).
 *
 * Sandbox adaptation: the spec defines separate jobs for:
 * - Purge old response_answers (weekly Sunday 03:00) — Seção 2.9
 * - Cleanup expired idempotency_keys (daily 04:00) — Seção 3.12
 *
 * The sandbox has no idempotency_keys table (adaptation). This endpoint handles:
 * 1. Delete expired Sessions (expiresAt < now)
 * 2. Delete unused ResponseTokens from completed/archived assessments older than 90 days
 * 3. Delete AuditLogs older than 1 year
 *
 * In production this would be split into separate jobs per the spec schedule.
 */
export async function POST() {
  try {
    await requireProfessional();

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // 1. Delete expired sessions
    const sessionsDeleted = await db.session.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // 2. Delete unused ResponseTokens from completed/archived assessments older than 90 days
    //    (keeps tokens from active/recent assessments for audit trail)
    const oldCompletedAssessments = await db.assessment.findMany({
      where: {
        status: { in: ["completed", "archived"] },
        completedAt: { lt: ninetyDaysAgo },
      },
      select: {
        id: true,
        departments: { select: { id: true } },
      },
    });
    const oldDeptIds = oldCompletedAssessments.flatMap((a) =>
      a.departments.map((d) => d.id),
    );
    const tokensDeleted =
      oldDeptIds.length > 0
        ? await db.responseToken.deleteMany({
            where: {
              assessmentDepartmentId: { in: oldDeptIds },
              isUsed: false,
            },
          })
        : { count: 0 };

    // 3. Delete audit logs older than 1 year
    const auditLogsDeleted = await db.auditLog.deleteMany({
      where: { createdAt: { lt: oneYearAgo } },
    });

    return jsonResponse({
      processed: true,
      details: {
        expiredSessions: sessionsDeleted.count,
        oldUnusedTokens: tokensDeleted.count,
        oldAuditLogs: auditLogsDeleted.count,
      },
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[system/cleanup POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
