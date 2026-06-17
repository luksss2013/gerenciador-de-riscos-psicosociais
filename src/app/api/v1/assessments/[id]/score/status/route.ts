import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

/**
 * GET /api/v1/assessments/:id/score/status
 * Spec §3.8 — returns the scoring status of an assessment.
 *
 * Response: 200 {
 *   status: 'idle' | 'running' | 'completed',
 *   lastRunAt: string | null   // ISO timestamp of the most recent dimension_result calculatedAt
 * }
 */
interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const assessment = await db.assessment.findUnique({
      where: { id },
      select: {
        id: true,
        professionalId: true,
        status: true,
        completedAt: true,
        departments: {
          select: {
            dimensionResults: {
              select: { calculatedAt: true },
              orderBy: { calculatedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    // Derive scoring status from the assessment status:
    // - 'completed' → scoring has run (status=completed)
    // - 'processing' → scoring is running
    // - otherwise → idle
    let scoreStatus: "idle" | "running" | "completed";
    if (assessment.status === "completed") {
      scoreStatus = "completed";
    } else if (assessment.status === "processing") {
      scoreStatus = "running";
    } else {
      scoreStatus = "idle";
    }

    // lastRunAt = the most recent dimension_result.calculatedAt across all depts
    let lastRunAt: string | null = null;
    let latest = 0;
    for (const dept of assessment.departments) {
      for (const dr of dept.dimensionResults) {
        const ts = dr.calculatedAt.getTime();
        if (ts > latest) {
          latest = ts;
          lastRunAt = dr.calculatedAt.toISOString();
        }
      }
    }

    return jsonResponse({
      status: scoreStatus,
      lastRunAt,
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[score/status GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
