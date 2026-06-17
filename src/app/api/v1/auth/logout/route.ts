import { cookies } from "next/headers";
import { ERROR_CODES } from "@/lib/errors";
import { clearSessionCookie, errorJson } from "@/lib/session";

const SESSION_COOKIE = "nr1_session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value ?? "";
    if (token) await clearSessionCookie(token);
    return new Response(null, {
      status: 204,
      headers: {
        "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`,
      },
    });
  } catch (e) {
    console.error("[logout]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
