import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { errorJson, jsonResponse, requireProfessional } from "@/lib/session";

const SESSION_COOKIE = "nr1_session";

// DELETE /api/v1/sessions/others — revoke all sessions EXCEPT the current one
// (identified by the nr1_session cookie). Fire-and-forget audit log write.
export async function DELETE() {
  try {
    const professional = await requireProfessional();
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE)?.value ?? "";

    const result = await db.session.deleteMany({
      where: {
        professionalId: professional.id,
        token: { not: currentToken },
      },
    });
    const revoked = result.count;

    // Fire-and-forget audit log.
    db.auditLog
      .create({
        data: {
          professionalId: professional.id,
          action: "sessions.revoke_others",
          resourceType: "professional",
          resourceId: professional.id,
          metadataJson: JSON.stringify({ revoked }),
        },
      })
      .catch(() => {});

    return jsonResponse({ revoked });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[sessions/others DELETE]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
