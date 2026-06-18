import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
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

    let sumResponded = 0;
    let sumExpected = 0;
    const byDept = assessment.departments.map((ad) => {
      sumResponded += ad.responseCount;
      sumExpected += ad.expectedResponses;
      const pct =
        ad.expectedResponses > 0 ? Math.round((ad.responseCount / ad.expectedResponses) * 100) : 0;
      return {
        id: ad.id,
        departmentId: ad.departmentId,
        name: ad.department.name,
        expected: ad.expectedResponses,
        responded: ad.responseCount,
        pct,
        isEligible: ad.isEligible,
      };
    });

    const globalAdesao = sumExpected > 0 ? Math.round((sumResponded / sumExpected) * 100) : 0;

    return jsonResponse({ globalAdesao, byDept });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[progress GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
