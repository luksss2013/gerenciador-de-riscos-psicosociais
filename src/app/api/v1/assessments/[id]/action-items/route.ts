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

interface CreateBody {
  departmentId?: unknown;
  dimensionCode?: unknown;
  riskLevelTrigger?: unknown;
  what?: unknown;
  why?: unknown;
  who?: unknown;
  where?: unknown;
  whenDate?: unknown;
  how?: unknown;
  estimatedCost?: unknown;
}

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];

export async function POST(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const assessment = await db.assessment.findUnique({ where: { id } });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    // Ensure action plan exists
    let plan = await db.actionPlan.findUnique({
      where: { assessmentId: assessment.id },
    });
    if (!plan) {
      plan = await db.actionPlan.create({ data: { assessmentId: assessment.id } });
    }

    const body = (await request.json()) as CreateBody;
    const what = typeof body.what === "string" ? body.what.trim() : "";
    const why = typeof body.why === "string" ? body.why.trim() : "";
    const who = typeof body.who === "string" ? body.who.trim() : "";
    const where = typeof body.where === "string" ? body.where.trim() : "";
    const how = typeof body.how === "string" ? body.how.trim() : "";
    const whenDateStr = typeof body.whenDate === "string" ? body.whenDate : "";

    if (what.length < 3) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "what min 3 chars");
    }
    if (why.length < 3) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "why min 3 chars");
    }
    if (who.length < 2) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "who min 2 chars");
    }
    if (where.length < 2) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "where min 2 chars");
    }
    if (how.length < 3) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "how min 3 chars");
    }
    const whenDate = new Date(whenDateStr);
    if (Number.isNaN(whenDate.getTime())) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "whenDate is invalid (YYYY-MM-DD)");
    }

    const departmentId =
      typeof body.departmentId === "string" && body.departmentId ? body.departmentId : null;
    const dimensionCode =
      typeof body.dimensionCode === "string" && /^D\d{1,2}$/.test(body.dimensionCode)
        ? body.dimensionCode
        : null;
    const riskLevelTrigger =
      typeof body.riskLevelTrigger === "string" && RISK_LEVELS.includes(body.riskLevelTrigger)
        ? body.riskLevelTrigger
        : null;
    const estimatedCost =
      typeof body.estimatedCost === "number" && body.estimatedCost >= 0
        ? body.estimatedCost
        : null;

    const item = await db.actionItem.create({
      data: {
        actionPlanId: plan.id,
        departmentId,
        dimensionCode,
        riskLevelTrigger,
        what,
        why,
        who,
        where,
        whenDate,
        how,
        estimatedCost,
        status: "pending",
      },
      include: { department: { select: { name: true } } },
    });

    db.auditLog.create({
      data: {
        professionalId: professional.id,
        action: "action_item.create",
        resourceType: "action_item",
        resourceId: item.id,
        metadataJson: JSON.stringify({ what: item.what.slice(0, 60) }),
      },
    }).catch(() => {});

    return jsonResponse(
      {
        id: item.id,
        actionPlanId: item.actionPlanId,
        departmentId: item.departmentId,
        departmentName: item.department?.name ?? null,
        dimensionCode: item.dimensionCode,
        riskLevelTrigger: item.riskLevelTrigger,
        what: item.what,
        why: item.why,
        who: item.who,
        where: item.where,
        whenDate: item.whenDate,
        how: item.how,
        estimatedCost: item.estimatedCost,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
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
    console.error("[action-items POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
