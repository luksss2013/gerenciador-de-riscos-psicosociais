import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";
import { runScoring } from "@/lib/scoring-service";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const assessment = await db.assessment.findUnique({ where: { id } });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    const { eligibleDepts, totalDimensions } = await runScoring(assessment.id);

    let status = assessment.status;
    if (["processing", "collecting"].includes(assessment.status)) {
      status = "completed";
      await db.assessment.update({
        where: { id: assessment.id },
        data: { status: "completed", completedAt: new Date() },
      });
    }

    return jsonResponse({ status, eligibleDepts, totalDimensions });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[score POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
