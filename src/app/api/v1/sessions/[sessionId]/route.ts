import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { errorJson, jsonResponse, requireProfessional } from "@/lib/session";

const SESSION_COOKIE = "nr1_session";

interface RouteCtx {
  params: Promise<{ sessionId: string }>;
}

// DELETE /api/v1/sessions/[sessionId] — revoke a single session by id.
// Cannot revoke the current session (use logout instead).
// Cannot revoke a session belonging to another professional.
export async function DELETE(_request: Request, { params }: RouteCtx) {
  try {
    const professional = await requireProfessional();
    const { sessionId } = await params;
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE)?.value ?? "";

    const session = await db.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return errorJson(ERROR_CODES.NOT_FOUND, "Session not found");
    }

    if (session.token === currentToken) {
      return errorJson(
        ERROR_CODES.VALIDATION_ERROR,
        "Cannot revoke current session — use logout instead",
      );
    }

    if (session.professionalId !== professional.id) {
      return errorJson(
        ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS,
        "Cannot revoke another professional's session",
      );
    }

    await db.session.delete({ where: { id: session.id } });

    // Fire-and-forget audit log.
    db.auditLog
      .create({
        data: {
          professionalId: professional.id,
          action: "sessions.revoke",
          resourceType: "professional",
          resourceId: professional.id,
          metadataJson: JSON.stringify({ revokedSessionId: sessionId }),
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
      return errorJson(
        ERROR_CODES.UNAUTHORIZED_TENANT_ACCESS,
        "Cannot revoke another professional's session",
      );
    }
    console.error("[sessions/[sessionId] DELETE]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
