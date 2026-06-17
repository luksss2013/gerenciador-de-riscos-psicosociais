import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
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
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: { departments: true },
    });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    if (assessment.status !== "draft") {
      return errorJson(ERROR_CODES.ASSESSMENT_NOT_DRAFT, "Assessment must be in draft to launch");
    }

    // endDate must be >= today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!assessment.endDate || assessment.endDate.getTime() < today.getTime()) {
      return errorJson(
        ERROR_CODES.VALIDATION_ERROR,
        "endDate must be today or later to launch"
      );
    }

    // Generate tokens: N = ceil(expected * 1.5)
    const tokenCreates: Promise<unknown>[] = [];
    let totalTokens = 0;
    const deptUpdates: { id: string; tokenCount: number }[] = [];

    for (const ad of assessment.departments) {
      const n = Math.ceil(ad.expectedResponses * 1.5);
      totalTokens += n;
      deptUpdates.push({ id: ad.id, tokenCount: n });
      const rows = Array.from({ length: n }).map(() => ({
        assessmentDepartmentId: ad.id,
        token: crypto.randomUUID(),
      }));
      tokenCreates.push(db.responseToken.createMany({ data: rows }));
    }

    await Promise.all(tokenCreates);
    await db.$transaction(
      deptUpdates.map((u) =>
        db.assessmentDepartment.update({
          where: { id: u.id },
          data: { tokenCount: u.tokenCount },
        })
      )
    );

    await db.assessment.update({
      where: { id: assessment.id },
      data: {
        status: "collecting",
        startDate: assessment.startDate ?? new Date(),
      },
    });

    // Fire-and-forget audit log with IP + user-agent (spec §5.3).
    logAudit({
      professionalId: professional.id,
      action: "assessment.launch",
      resourceType: "assessment",
      resourceId: assessment.id,
      metadata: { totalTokens },
      request,
    });

    return jsonResponse({ status: "collecting", totalTokens });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[launch POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
