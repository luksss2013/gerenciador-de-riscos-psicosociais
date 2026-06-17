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

interface GenBody {
  type?: unknown;
  metadata?: unknown;
}

const VALID_TYPES = ["pdf", "docx", "html"];

export async function POST(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;
    const assessment = await db.assessment.findUnique({
      where: { id },
      include: { departments: { select: { id: true, isEligible: true } } },
    });
    if (!assessment) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(assessment.professionalId, professional.id);

    const body = (await request.json()) as GenBody;
    const type =
      typeof body.type === "string" && VALID_TYPES.includes(body.type) ? body.type : "";
    if (!type) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "type must be pdf|docx|html");
    }

    const metadata =
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : {};
    const responsibleName =
      typeof metadata.responsibleName === "string" && metadata.responsibleName.trim()
        ? metadata.responsibleName.trim()
        : professional.name;
    const credentialNumber =
      typeof metadata.credentialNumber === "string" && metadata.credentialNumber.trim()
        ? metadata.credentialNumber.trim()
        : professional.credentialNumber ?? "";
    const reportDate =
      typeof metadata.reportDate === "string" && metadata.reportDate
        ? metadata.reportDate
        : new Date().toISOString().slice(0, 10);
    const notes =
      typeof metadata.notes === "string" && metadata.notes.trim()
        ? metadata.notes.trim()
        : null;

    // RB-04 prerequisite checks
    const failed: string[] = [];
    if (assessment.status !== "completed") failed.push("ASSESSMENT_NOT_COMPLETED");
    if (!assessment.participationRegistration || !assessment.participationRegistration.trim()) {
      failed.push("PARTICIPATION_NOT_REGISTERED");
    }
    const eligibleDepts = assessment.departments.filter((d) => d.isEligible);
    if (eligibleDepts.length < 1) failed.push("NO_ELIGIBLE_DEPARTMENTS");
    if (failed.length > 0) {
      return errorJson(
        ERROR_CODES.REPORT_PREREQUISITES_UNMET,
        "Report prerequisites unmet",
        { failedChecks: failed }
      );
    }

    const metadataJson = JSON.stringify({
      responsibleName,
      credentialNumber,
      reportDate,
      notes,
    });

    const report = await db.report.create({
      data: {
        assessmentId: assessment.id,
        type,
        storageKey: `reports/${professional.id}/${assessment.companyId}/${assessment.id}/${crypto.randomUUID()}.${type}`,
        status: "ready",
        metadataJson,
      },
    });

    // Fire-and-forget audit log — never blocks the response.
    db.auditLog.create({
      data: {
        professionalId: professional.id,
        action: "report.generate",
        resourceType: "assessment",
        resourceId: assessment.id,
        metadataJson: JSON.stringify({ type, reportId: report.id }),
      },
    }).catch(() => {});

    return jsonResponse(
      { reportId: report.id, status: report.status, type: report.type, storageKey: report.storageKey },
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
    console.error("[reports/generate POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
