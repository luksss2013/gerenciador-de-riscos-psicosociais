import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { runScoring } from "@/lib/scoring-service";
import {
  errorJson,
  jsonResponse,
  logAudit,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const assessment = await db.assessment.findUnique({ where: { id } });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    if (assessment.status !== "collecting") {
      return errorJson(
        ERROR_CODES.ASSESSMENT_NOT_COLLECTING,
        "Assessment must be collecting to close",
      );
    }

    // Set to processing
    await db.assessment.update({
      where: { id: assessment.id },
      data: { status: "processing" },
    });

    // Run scoring synchronously
    const { eligibleDepts, totalDimensions } = await runScoring(assessment.id);

    // Mark completed
    await db.assessment.update({
      where: { id: assessment.id },
      data: { status: "completed", completedAt: new Date() },
    });

    // Fire-and-forget audit log with IP + user-agent (spec §5.3).
    logAudit({
      professionalId: professional.id,
      action: "assessment.close",
      resourceType: "assessment",
      resourceId: assessment.id,
      metadata: { eligibleDepts, totalDimensions },
      request,
    });

    return jsonResponse({ status: "completed", eligibleDepts, totalDimensions });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[close POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
