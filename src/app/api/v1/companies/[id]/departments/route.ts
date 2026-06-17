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

async function fetchCompanyOwned(id: string, professionalId: string) {
  const company = await db.company.findUnique({ where: { id } });
  if (!company || !company.isActive) return null;
  await requireTenantOwnership(company.professionalId, professionalId);
  return company;
}

function serializeDept(d: {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  workerCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: d.id,
    companyId: d.companyId,
    name: d.name,
    description: d.description,
    workerCount: d.workerCount,
    isActive: d.isActive,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const company = await fetchCompanyOwned(id, professional.id);
    if (!company) {
      return errorJson(ERROR_CODES.COMPANY_NOT_FOUND, "Company not found");
    }
    const departments = await db.department.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { name: "asc" },
    });
    return jsonResponse({ data: departments.map(serializeDept) });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[departments GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

interface CreateBody {
  name?: unknown;
  description?: unknown;
  workerCount?: unknown;
}

export async function POST(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const company = await fetchCompanyOwned(id, professional.id);
    if (!company) {
      return errorJson(ERROR_CODES.COMPANY_NOT_FOUND, "Company not found");
    }
    const body = (await request.json()) as CreateBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
    const workerCount =
      typeof body.workerCount === "number" &&
      Number.isInteger(body.workerCount) &&
      body.workerCount >= 1
        ? body.workerCount
        : 0;

    if (name.length < 2) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "name is required (min 2 chars)");
    }
    if (workerCount < 1) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "workerCount must be ≥1");
    }

    const existing = await db.department.findUnique({
      where: { companyId_name: { companyId: company.id, name } },
    });
    if (existing) {
      return errorJson(ERROR_CODES.DEPARTMENT_NAME_DUPLICATE, "Department name already used in this company");
    }

    const dept = await db.department.create({
      data: {
        companyId: company.id,
        name,
        description,
        workerCount,
      },
    });
    return jsonResponse(serializeDept(dept), 201);
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[departments POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
