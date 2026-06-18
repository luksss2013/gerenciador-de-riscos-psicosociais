import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  requireProfessional,
  requireTenantOwnership,
  workerJsonResponse,
} from "@/lib/session";

interface RouteCtx {
  params: Promise<{ assessmentDeptId: string }>;
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { assessmentDeptId } = await params;
    const ad = await db.assessmentDepartment.findUnique({
      where: { id: assessmentDeptId },
      include: { assessment: true },
    });
    if (!ad) {
      return errorJson(ERROR_CODES.ASSESSMENT_DEPT_NOT_FOUND, "Assessment department not found");
    }
    await requireTenantOwnership(ad.assessment.professionalId, professional.id);

    const tokenCount = await db.responseToken.count({
      where: { assessmentDepartmentId: ad.id },
    });

    return workerJsonResponse({
      departmentId: ad.departmentId,
      expectedResponses: ad.expectedResponses,
      tokenCount,
    });
  } catch (e) {
    if ((e as { code?: string })?.code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[respond/dept GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
