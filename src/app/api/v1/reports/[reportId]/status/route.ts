import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

interface RouteCtx {
  params: Promise<{ reportId: string }>;
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { reportId } = await params;
    const report = await db.report.findUnique({
      where: { id: reportId },
      include: { assessment: true },
    });
    if (!report) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Report not found");
    }
    await requireTenantOwnership(report.assessment.professionalId, professional.id);

    return jsonResponse({
      id: report.id,
      status: report.status,
      fileSizeBytes: report.fileSizeBytes,
      generatedAt: report.generatedAt,
      errorMessage: report.errorMessage,
      storageKey: report.storageKey,
      type: report.type,
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[report status GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
