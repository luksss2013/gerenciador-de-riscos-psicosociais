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

interface DuplicateBody {
  title?: unknown;
}

export async function POST(request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { id } = await params;

    // Fetch source assessment + its AssessmentDepartment rows (config snapshot).
    const source = await db.assessment.findUnique({
      where: { id },
      include: { departments: true },
    });
    if (!source) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Assessment not found");
    }
    await requireTenantOwnership(source.professionalId, professional.id);

    // Optional title override. Empty body or invalid JSON → fallback to default.
    let overrideTitle: string | null = null;
    try {
      const body = (await request.json()) as DuplicateBody;
      if (
        body &&
        typeof body === "object" &&
        typeof body.title === "string" &&
        body.title.trim().length >= 2
      ) {
        overrideTitle = body.title.trim();
      }
    } catch {
      // No body or malformed JSON — use default title below.
    }
    const newTitle = overrideTitle ?? `${source.title} (cópia)`;

    // Atomic: clone Assessment + AssessmentDepartment rows (config only —
    // responses/tokens/eligibility are reset to a fresh draft state).
    const newAssessment = await db.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: {
          title: newTitle,
          status: "draft",
          startDate: null,
          endDate: null,
          participationRegistration: null,
          workerCommunicationSentAt: null,
          completedAt: null,
          companyId: source.companyId,
          professionalId: source.professionalId,
          instrument: source.instrument,
          departments: {
            create: source.departments.map((ad) => ({
              departmentId: ad.departmentId,
              expectedResponses: ad.expectedResponses,
              tokenCount: 0,
              responseCount: 0,
              isEligible: false,
            })),
          },
        },
        include: {
          departments: { include: { department: true } },
        },
      });
      return created;
    });

    // Fire-and-forget audit log — never awaits, never fails the response.
    db.auditLog
      .create({
        data: {
          professionalId: professional.id,
          action: "assessment.duplicate",
          resourceType: "assessment",
          resourceId: newAssessment.id,
          metadataJson: JSON.stringify({
            sourceAssessmentId: id,
            sourceTitle: source.title,
          }),
        },
      })
      .catch(() => {});

    // Same response shape as GET /assessments/:id.
    return jsonResponse(
      {
        id: newAssessment.id,
        companyId: newAssessment.companyId,
        professionalId: newAssessment.professionalId,
        instrument: newAssessment.instrument,
        title: newAssessment.title,
        status: newAssessment.status,
        startDate: newAssessment.startDate,
        endDate: newAssessment.endDate,
        participationRegistration: newAssessment.participationRegistration,
        workerCommunicationSentAt: newAssessment.workerCommunicationSentAt,
        createdAt: newAssessment.createdAt,
        updatedAt: newAssessment.updatedAt,
        completedAt: newAssessment.completedAt,
        departments: newAssessment.departments.map((ad) => ({
          id: ad.id,
          departmentId: ad.departmentId,
          name: ad.department.name,
          expected: ad.expectedResponses,
          responded: ad.responseCount,
          isEligible: ad.isEligible,
          tokenCount: ad.tokenCount,
        })),
      },
      201,
    );
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    if (code === ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS) {
      return errorJson(
        ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS,
        "Cross-tenant access denied",
      );
    }
    console.error("[assessment duplicate]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
