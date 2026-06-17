import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
  requireTenantOwnership,
} from "@/lib/session";

interface RouteCtx {
  params: Promise<{ id: string; deptId: string }>;
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id, deptId } = await params;
    const company = await db.company.findUnique({ where: { id } });
    if (!company || !company.isActive) {
      return errorJson(ERROR_CODES.COMPANY_NOT_FOUND, "Company not found");
    }
    await requireTenantOwnership(company.professionalId, professional.id);

    const dept = await db.department.findUnique({ where: { id: deptId } });
    if (!dept || !dept.isActive || dept.companyId !== company.id) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Department not found");
    }

    const body = (await request.json()) as {
      name?: unknown;
      description?: unknown;
      workerCount?: unknown;
    };
    const data: {
      name?: string;
      description?: string | null;
      workerCount?: number;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 2) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "name must be at least 2 chars");
      }
      const newName = body.name.trim();
      if (newName !== dept.name) {
        const dup = await db.department.findUnique({
          where: { companyId_name: { companyId: company.id, name: newName } },
        });
        if (dup) {
          return errorJson(ERROR_CODES.DEPARTMENT_NAME_DUPLICATE, "Department name already used in this company");
        }
      }
      data.name = newName;
    }
    if (body.description !== undefined) {
      data.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }
    if (body.workerCount !== undefined) {
      if (
        typeof body.workerCount !== "number" ||
        !Number.isInteger(body.workerCount) ||
        body.workerCount < 1
      ) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "workerCount must be ≥1");
      }
      data.workerCount = body.workerCount;
    }

    const updated = await db.department.update({ where: { id: dept.id }, data });
    db.auditLog.create({
      data: {
        professionalId: professional.id,
        action: "department.update",
        resourceType: "department",
        resourceId: updated.id,
        metadataJson: JSON.stringify({ fields: Object.keys(body) }),
      },
    }).catch(() => {});
    return jsonResponse({
      id: updated.id,
      companyId: updated.companyId,
      name: updated.name,
      description: updated.description,
      workerCount: updated.workerCount,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[department PATCH]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id, deptId } = await params;
    const company = await db.company.findUnique({ where: { id } });
    if (!company) {
      return errorJson(ERROR_CODES.COMPANY_NOT_FOUND, "Company not found");
    }
    await requireTenantOwnership(company.professionalId, professional.id);

    const dept = await db.department.findUnique({ where: { id: deptId } });
    if (!dept || dept.companyId !== company.id) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Department not found");
    }

    // RB-08: cannot delete if any active assessment uses this department
    const activeAssessmentDept = await db.assessmentDepartment.findFirst({
      where: {
        departmentId: dept.id,
        assessment: { status: { in: ["collecting", "processing"] } },
      },
      select: { id: true },
    });
    if (activeAssessmentDept) {
      return errorJson(
        ERROR_CODES.DEPARTMENT_HAS_ACTIVE_ASSESSMENT,
        "Department has active assessment; close or wait before deletion"
      );
    }

    await db.department.update({ where: { id: dept.id }, data: { isActive: false } });
    db.auditLog.create({
      data: {
        professionalId: professional.id,
        action: "department.delete",
        resourceType: "department",
        resourceId: dept.id,
        metadataJson: JSON.stringify({ name: dept.name }),
      },
    }).catch(() => {});
    return jsonResponse({ ok: true });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[department DELETE]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
