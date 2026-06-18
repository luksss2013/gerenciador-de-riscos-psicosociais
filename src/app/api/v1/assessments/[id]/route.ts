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

    return jsonResponse({
      id: assessment.id,
      companyId: assessment.companyId,
      professionalId: assessment.professionalId,
      instrument: assessment.instrument,
      title: assessment.title,
      status: assessment.status,
      startDate: assessment.startDate,
      endDate: assessment.endDate,
      participationRegistration: assessment.participationRegistration,
      workerCommunicationSentAt: assessment.workerCommunicationSentAt,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
      completedAt: assessment.completedAt,
      departments: assessment.departments.map((ad) => ({
        id: ad.id,
        departmentId: ad.departmentId,
        name: ad.department.name,
        expected: ad.expectedResponses,
        responded: ad.responseCount,
        isEligible: ad.isEligible,
        tokenCount: ad.tokenCount,
      })),
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[assessment GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

interface PatchBody {
  title?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  participationRegistration?: unknown;
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const assessment = await db.assessment.findUnique({ where: { id } });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    if (!["draft", "collecting"].includes(assessment.status)) {
      return errorJson(
        ERROR_CODES.ASSESSMENT_NOT_DRAFT,
        "Assessment cannot be edited in current status",
      );
    }

    const body = (await request.json()) as PatchBody;
    const data: {
      title?: string;
      startDate?: Date | null;
      endDate?: Date;
      participationRegistration?: string | null;
    } = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length < 2) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "title must be at least 2 chars");
      }
      data.title = body.title.trim();
    }
    if (body.startDate !== undefined) {
      if (body.startDate === null) {
        data.startDate = null;
      } else if (typeof body.startDate === "string") {
        const d = new Date(body.startDate);
        if (Number.isNaN(d.getTime())) {
          return errorJson(ERROR_CODES.VALIDATION_ERROR, "startDate is invalid");
        }
        data.startDate = d;
      }
    }
    if (body.endDate !== undefined) {
      if (typeof body.endDate !== "string") {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "endDate is invalid");
      }
      const d = new Date(body.endDate);
      if (Number.isNaN(d.getTime())) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "endDate is invalid");
      }
      const start = data.startDate ?? assessment.startDate ?? new Date();
      if (d.getTime() < start.getTime()) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "endDate must be after startDate");
      }
      data.endDate = d;
    }
    if (body.participationRegistration !== undefined) {
      data.participationRegistration =
        typeof body.participationRegistration === "string" && body.participationRegistration.trim()
          ? body.participationRegistration.trim()
          : null;
    }

    const updated = await db.assessment.update({ where: { id: assessment.id }, data });
    db.auditLog
      .create({
        data: {
          professionalId: professional.id,
          action: "assessment.update",
          resourceType: "assessment",
          resourceId: updated.id,
          metadataJson: JSON.stringify({ fields: Object.keys(body) }),
        },
      })
      .catch(() => {});
    return jsonResponse({
      id: updated.id,
      companyId: updated.companyId,
      professionalId: updated.professionalId,
      instrument: updated.instrument,
      title: updated.title,
      status: updated.status,
      startDate: updated.startDate,
      endDate: updated.endDate,
      participationRegistration: updated.participationRegistration,
      workerCommunicationSentAt: updated.workerCommunicationSentAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      completedAt: updated.completedAt,
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[assessment PATCH]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
