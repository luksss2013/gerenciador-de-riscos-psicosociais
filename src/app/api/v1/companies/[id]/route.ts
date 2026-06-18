import { formatCnpj } from "@/lib/cnpj";
import { db } from "@/lib/db";
import { BRAZILIAN_UFS, ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

function serializeCompany(c: {
  id: string;
  name: string;
  cnpj: string;
  cnaePrimary: string | null;
  employeeCount: number | null;
  city: string | null;
  state: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  dpoPoc: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  professionalId: string;
}) {
  return {
    id: c.id,
    name: c.name,
    cnpj: c.cnpj,
    cnpjFormatted: formatCnpj(c.cnpj),
    cnaePrimary: c.cnaePrimary,
    employeeCount: c.employeeCount,
    city: c.city,
    state: c.state,
    contactName: c.contactName,
    contactEmail: c.contactEmail,
    contactPhone: c.contactPhone,
    dpoPoc: c.dpoPoc,
    isActive: c.isActive,
    professionalId: c.professionalId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

async function fetchCompany(id: string) {
  return db.company.findUnique({ where: { id } });
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const company = await fetchCompany(id);
    if (!company?.isActive) {
      return errorJson(ERROR_CODES.COMPANY_NOT_FOUND, "Company not found");
    }
    await requireTenantOwnership(company.professionalId, professional.id);

    const [departmentsCount, assessmentsCount, lastAssessment] = await Promise.all([
      db.department.count({ where: { companyId: company.id, isActive: true } }),
      db.assessment.count({ where: { companyId: company.id } }),
      db.assessment.findFirst({
        where: { companyId: company.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, completedAt: true, title: true },
      }),
    ]);

    return jsonResponse({
      ...serializeCompany(company),
      summary: {
        departmentsCount,
        assessmentsCount,
        lastAssessmentId: lastAssessment?.id ?? null,
        lastAssessmentTitle: lastAssessment?.title ?? null,
        lastAssessmentStatus: lastAssessment?.status ?? null,
        lastAssessmentCompletedAt: lastAssessment?.completedAt ?? null,
      },
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[company GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

interface PatchBody {
  name?: unknown;
  cnaePrimary?: unknown;
  employeeCount?: unknown;
  city?: unknown;
  state?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  dpoPoc?: unknown;
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const company = await fetchCompany(id);
    if (!company?.isActive) {
      return errorJson(ERROR_CODES.COMPANY_NOT_FOUND, "Company not found");
    }
    await requireTenantOwnership(company.professionalId, professional.id);

    const body = (await request.json()) as PatchBody;
    const data: {
      name?: string;
      cnaePrimary?: string | null;
      employeeCount?: number | null;
      city?: string | null;
      state?: string | null;
      contactName?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      dpoPoc?: string | null;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 2) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "name must be at least 2 chars");
      }
      data.name = body.name.trim();
    }
    if (body.cnaePrimary !== undefined) {
      data.cnaePrimary =
        typeof body.cnaePrimary === "string" && body.cnaePrimary.trim()
          ? body.cnaePrimary.trim()
          : null;
    }
    if (body.employeeCount !== undefined) {
      data.employeeCount =
        typeof body.employeeCount === "number" &&
        Number.isInteger(body.employeeCount) &&
        body.employeeCount > 0
          ? body.employeeCount
          : null;
    }
    if (body.city !== undefined) {
      data.city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : null;
    }
    if (body.state !== undefined) {
      data.state =
        typeof body.state === "string" && BRAZILIAN_UFS.includes(body.state.toUpperCase())
          ? body.state.toUpperCase()
          : null;
    }
    if (body.contactName !== undefined) {
      data.contactName =
        typeof body.contactName === "string" && body.contactName.trim()
          ? body.contactName.trim()
          : null;
    }
    if (body.contactEmail !== undefined) {
      data.contactEmail =
        typeof body.contactEmail === "string" && body.contactEmail.trim()
          ? body.contactEmail.trim()
          : null;
    }
    if (body.contactPhone !== undefined) {
      data.contactPhone =
        typeof body.contactPhone === "string" && body.contactPhone.trim()
          ? body.contactPhone.trim()
          : null;
    }
    if (body.dpoPoc !== undefined) {
      data.dpoPoc =
        typeof body.dpoPoc === "string" && body.dpoPoc.trim() ? body.dpoPoc.trim() : null;
    }

    const updated = await db.company.update({ where: { id: company.id }, data });
    db.auditLog
      .create({
        data: {
          professionalId: professional.id,
          action: "company.update",
          resourceType: "company",
          resourceId: updated.id,
          metadataJson: JSON.stringify({ id: updated.id, fields: Object.keys(body) }),
        },
      })
      .catch(() => {});
    return jsonResponse(serializeCompany(updated));
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[company PATCH]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const company = await fetchCompany(id);
    if (!company) {
      return errorJson(ERROR_CODES.COMPANY_NOT_FOUND, "Company not found");
    }
    await requireTenantOwnership(company.professionalId, professional.id);

    // RB-08: cannot delete if any active assessment (collecting/processing)
    const activeAssessment = await db.assessment.findFirst({
      where: {
        companyId: company.id,
        status: { in: ["collecting", "processing"] },
      },
      select: { id: true },
    });
    if (activeAssessment) {
      return errorJson(
        ERROR_CODES.DEPARTMENT_HAS_ACTIVE_ASSESSMENT,
        "Company has active assessment; close or wait before deletion",
      );
    }

    await db.company.update({ where: { id: company.id }, data: { isActive: false } });
    db.auditLog
      .create({
        data: {
          professionalId: professional.id,
          action: "company.delete",
          resourceType: "company",
          resourceId: company.id,
          metadataJson: JSON.stringify({ id: company.id, name: company.name }),
        },
      })
      .catch(() => {});
    return jsonResponse({ ok: true });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[company DELETE]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
