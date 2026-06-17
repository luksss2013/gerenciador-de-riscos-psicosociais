import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
} from "@/lib/session";

const SESSION_COOKIE = "nr1_session";

// GET /api/v1/sessions — list all active (non-expired) sessions for the
// current professional. NEVER exposes full tokens — only the last 8 chars as
// a preview ("…" + last8) plus an isCurrent flag identifying the session that
// matches the nr1_session cookie.
export async function GET() {
  try {
    const professional = await requireProfessional();
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE)?.value ?? "";

    const sessions = await db.session.findMany({
      where: {
        professionalId: professional.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        token: true,
      },
    });

    const data = sessions.map((s) => {
      const last8 = s.token.length >= 8 ? s.token.slice(-8) : s.token;
      return {
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        tokenPreview: `…${last8}`,
        isCurrent: s.token === currentToken,
      };
    });

    return jsonResponse({ data });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[sessions GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
