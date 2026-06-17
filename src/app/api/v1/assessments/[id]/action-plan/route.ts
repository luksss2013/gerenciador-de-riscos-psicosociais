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

function serializeItem(i: {
  id: string;
  actionPlanId: string;
  departmentId: string | null;
  department?: { name: string } | null;
  dimensionCode: string | null;
  riskLevelTrigger: string | null;
  what: string;
  why: string;
  who: string;
  where: string;
  whenDate: Date;
  how: string;
  estimatedCost: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: i.id,
    actionPlanId: i.actionPlanId,
    departmentId: i.departmentId,
    departmentName: i.department?.name ?? null,
    dimensionCode: i.dimensionCode,
    riskLevelTrigger: i.riskLevelTrigger,
    what: i.what,
    why: i.why,
    who: i.who,
    where: i.where,
    whenDate: i.whenDate,
    how: i.how,
    estimatedCost: i.estimatedCost,
    status: i.status,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const assessment = await db.assessment.findUnique({ where: { id } });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    // Get-or-create ActionPlan (idempotent)
    let plan = await db.actionPlan.findUnique({
      where: { assessmentId: assessment.id },
      include: {
        items: {
          include: { department: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!plan) {
      plan = await db.actionPlan.create({
        data: { assessmentId: assessment.id },
        include: {
          items: { include: { department: { select: { name: true } } } },
        },
      });
    }

    return jsonResponse({
      id: plan.id,
      assessmentId: plan.assessmentId,
      actionItems: plan.items.map(serializeItem),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS, "Cross-tenant access denied");
    }
    console.error("[action-plan GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
