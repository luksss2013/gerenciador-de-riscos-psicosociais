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

function serializeAssessment(a: {
  id: string;
  companyId: string;
  professionalId: string;
  instrument: string;
  title: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  participationRegistration: string | null;
  workerCommunicationSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}) {
  return {
    id: a.id,
    companyId: a.companyId,
    professionalId: a.professionalId,
    instrument: a.instrument,
    title: a.title,
    status: a.status,
    startDate: a.startDate,
    endDate: a.endDate,
    participationRegistration: a.participationRegistration,
    workerCommunicationSentAt: a.workerCommunicationSentAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    completedAt: a.completedAt,
  };
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const company = await db.company.findUnique({ where: { id } });
    if (!company || !company.isActive) {
      return errorJson(ERROR_CODES.COMPANY_NOT_FOUND, "Company not found");
    }
    await requireTenantOwnership(company.professionalId, professional.id);

    const assessments = await db.assessment.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse({ data: assessments.map(serializeAssessment) });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[assessments GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

interface CreateBody {
  title?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  departments?: unknown;
}

export async function POST(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const company = await db.company.findUnique({ where: { id } });
    if (!company || !company.isActive) {
      return errorJson(ERROR_CODES.COMPANY_NOT_FOUND, "Company not found");
    }
    await requireTenantOwnership(company.professionalId, professional.id);

    const body = (await request.json()) as CreateBody;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length < 2) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "title is required (min 2 chars)");
    }
    const startDate =
      typeof body.startDate === "string" && body.startDate ? new Date(body.startDate) : null;
    const endDate =
      typeof body.endDate === "string" && body.endDate ? new Date(body.endDate) : null;
    if (!endDate || Number.isNaN(endDate.getTime())) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "endDate is required (ISO date)");
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveStart = startDate ?? today;
    if (Number.isNaN(effectiveStart.getTime())) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "startDate is invalid");
    }
    if (endDate.getTime() < effectiveStart.getTime()) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "endDate must be after startDate");
    }

    if (!Array.isArray(body.departments) || body.departments.length < 1) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "At least 1 department is required");
    }
    const deptInputs = (body.departments as unknown[])
      .map((d) => {
        if (!d || typeof d !== "object") return null;
        const o = d as { departmentId?: unknown; expectedResponses?: unknown };
        if (typeof o.departmentId !== "string" || !o.departmentId) return null;
        if (
          typeof o.expectedResponses !== "number" ||
          !Number.isInteger(o.expectedResponses) ||
          o.expectedResponses < 1
        ) {
          return null;
        }
        return { departmentId: o.departmentId, expectedResponses: o.expectedResponses };
      })
      .filter((x): x is { departmentId: string; expectedResponses: number } => x !== null);
    if (deptInputs.length < 1) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "departments invalid");
    }

    // Verify depts belong to company
    const deptIds = Array.from(new Set(deptInputs.map((d) => d.departmentId)));
    const ownedDepts = await db.department.findMany({
      where: { id: { in: deptIds }, companyId: company.id, isActive: true },
      select: { id: true },
    });
    if (ownedDepts.length !== deptIds.length) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "One or more departments are invalid for this company");
    }

    const assessment = await db.assessment.create({
      data: {
        companyId: company.id,
        professionalId: professional.id,
        title,
        status: "draft",
        startDate: startDate ?? null,
        endDate,
        departments: {
          create: deptInputs.map((d) => ({
            departmentId: d.departmentId,
            expectedResponses: d.expectedResponses,
          })),
        },
      },
      include: { departments: true },
    });

    db.auditLog.create({
      data: {
        professionalId: professional.id,
        action: "assessment.create",
        resourceType: "assessment",
        resourceId: assessment.id,
        metadataJson: JSON.stringify({ title: assessment.title, deptCount: deptInputs.length }),
      },
    }).catch(() => {});

    return jsonResponse(
      { id: assessment.id, status: assessment.status, ...serializeAssessment(assessment) },
      201
    );
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[assessments POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
