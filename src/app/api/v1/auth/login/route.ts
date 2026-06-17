import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import {
  createSessionCookie,
  errorJson,
  verifyPassword,
} from "@/lib/session";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!isValidEmail(email) || !password) {
      return errorJson(ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials");
    }

    const professional = await db.professional.findUnique({ where: { email } });
    if (!professional) {
      return errorJson(ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials");
    }

    const ok = await verifyPassword(password, professional.passwordHash);
    if (!ok) {
      return errorJson(ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials");
    }

    const cookie = createSessionCookie(professional.id);
    const pub = {
      id: professional.id,
      name: professional.name,
      email: professional.email,
      professionType: professional.professionType,
      credentialNumber: professional.credentialNumber,
      phone: professional.phone,
      acceptedTerms: professional.acceptedTerms,
      createdAt: professional.createdAt,
      updatedAt: professional.updatedAt,
    };
    return new Response(JSON.stringify({ professional: pub }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": `${cookie.name}=${cookie.value}; HttpOnly; Path=/; Max-Age=${cookie.maxAge}; SameSite=Strict`,
      },
    });
  } catch (e) {
    console.error("[login]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
