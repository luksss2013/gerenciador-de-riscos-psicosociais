import { db } from "@/lib/db";
import { ERROR_CODES, BRAZILIAN_UFS } from "@/lib/errors";
import { isValidCnpj, sanitizeCnpj, formatCnpj } from "@/lib/cnpj";
import {
  errorJson,
  jsonResponse,
  parsePagination,
  requireProfessional,
} from "@/lib/session";

async function buildCompanySummary(companyId: string) {
  const [departmentsCount, lastAssessment] = await Promise.all([
    db.department.count({ where: { companyId, isActive: true } }),
    db.assessment.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, completedAt: true },
    }),
  ]);
  return {
    departmentsCount,
    lastAssessmentId: lastAssessment?.id ?? null,
    lastAssessmentStatus: lastAssessment?.status ?? null,
    lastAssessmentCompletedAt: lastAssessment?.completedAt ?? null,
  };
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

export async function GET(request: Request) {
  try {
    const professional = await requireProfessional();
    const { page, limit, q } = parsePagination(request);

    const where = {
      professionalId: professional.id,
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { cnpj: { contains: sanitizeCnpj(q) } },
            ],
          }
        : {}),
    };

    const [total, companies] = await Promise.all([
      db.company.count({ where }),
      db.company.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const withSummary = await Promise.all(
      companies.map(async (c) => ({
        ...serializeCompany(c),
        summary: await buildCompanySummary(c.id),
      }))
    );

    const pages = Math.max(1, Math.ceil(total / limit));
    return jsonResponse({
      data: withSummary,
      meta: { total, page, limit, pages },
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[companies GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

interface CreateBody {
  name?: unknown;
  cnpj?: unknown;
  cnaePrimary?: unknown;
  employeeCount?: unknown;
  city?: unknown;
  state?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  dpoPoc?: unknown;
}

export async function POST(request: Request) {
  try {
    const professional = await requireProfessional();
    const body = (await request.json()) as CreateBody;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const cnpjRaw = typeof body.cnpj === "string" ? body.cnpj : "";
    if (name.length < 2) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "name is required (min 2 chars)");
    }
    if (!isValidCnpj(cnpjRaw)) {
      return errorJson(ERROR_CODES.CNPJ_INVALID, "CNPJ is invalid");
    }
    const cnpj = sanitizeCnpj(cnpjRaw);

    const existing = await db.company.findUnique({ where: { cnpj } });
    if (existing) {
      return errorJson(ERROR_CODES.CNPJ_ALREADY_REGISTERED, "CNPJ already registered");
    }

    const cnaePrimary =
      typeof body.cnaePrimary === "string" && body.cnaePrimary.trim()
        ? body.cnaePrimary.trim()
        : null;
    const employeeCount =
      typeof body.employeeCount === "number" && Number.isInteger(body.employeeCount) && body.employeeCount > 0
        ? body.employeeCount
        : null;
    const city =
      typeof body.city === "string" && body.city.trim() ? body.city.trim() : null;
    const state =
      typeof body.state === "string" &&
      BRAZILIAN_UFS.includes(body.state.toUpperCase())
        ? body.state.toUpperCase()
        : null;
    const contactName =
      typeof body.contactName === "string" && body.contactName.trim()
        ? body.contactName.trim()
        : null;
    const contactEmail =
      typeof body.contactEmail === "string" && body.contactEmail.trim()
        ? body.contactEmail.trim()
        : null;
    const contactPhone =
      typeof body.contactPhone === "string" && body.contactPhone.trim()
        ? body.contactPhone.trim()
        : null;
    const dpoPoc =
      typeof body.dpoPoc === "string" && body.dpoPoc.trim()
        ? body.dpoPoc.trim()
        : null;

    const company = await db.company.create({
      data: {
        professionalId: professional.id,
        name,
        cnpj,
        cnaePrimary,
        employeeCount,
        city,
        state,
        contactName,
        contactEmail,
        contactPhone,
        dpoPoc,
      },
    });

    // Fire-and-forget audit log — never blocks the response.
    db.auditLog.create({
      data: {
        professionalId: professional.id,
        action: "company.create",
        resourceType: "company",
        resourceId: company.id,
        metadataJson: JSON.stringify({ name: company.name, cnpj: company.cnpj }),
      },
    }).catch(() => {});

    return jsonResponse(
      { ...serializeCompany(company), summary: await buildCompanySummary(company.id) },
      201
    );
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[companies POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
