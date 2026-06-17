import { db } from "@/lib/db";
import { ERROR_CODES, PROFESSION_TYPES } from "@/lib/errors";
import {
  createSessionCookie,
  errorJson,
  hashPassword,
  jsonResponse,
} from "@/lib/session";
import type { ProfessionType } from "@/lib/errors";

interface RegisterBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  professionType?: unknown;
  credentialNumber?: unknown;
  phone?: unknown;
  acceptedTerms?: unknown;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function publicProfessional(p: {
  id: string;
  name: string;
  email: string;
  professionType: string;
  credentialNumber: string | null;
  phone: string | null;
  acceptedTerms: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    professionType: p.professionType,
    credentialNumber: p.credentialNumber,
    phone: p.phone,
    acceptedTerms: p.acceptedTerms,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const professionType = typeof body.professionType === "string" ? body.professionType : "";
    const credentialNumber =
      typeof body.credentialNumber === "string" && body.credentialNumber.trim()
        ? body.credentialNumber.trim()
        : null;
    const phone =
      typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    const acceptedTerms = body.acceptedTerms === true;

    if (!name || name.length < 2) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "name is required (min 2 chars)");
    }
    if (!isValidEmail(email)) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "email is invalid");
    }
    if (password.length < 8) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "password must be at least 8 chars");
    }
    if (!PROFESSION_TYPES.includes(professionType as ProfessionType)) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "professionType is invalid");
    }
    if (!acceptedTerms) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "acceptedTerms must be true");
    }

    const existing = await db.professional.findUnique({ where: { email } });
    if (existing) {
      return errorJson(ERROR_CODES.EMAIL_ALREADY_REGISTERED, "Email already registered");
    }

    const passwordHash = await hashPassword(password);
    const professional = await db.professional.create({
      data: {
        name,
        email,
        passwordHash,
        professionType: professionType as ProfessionType,
        credentialNumber,
        phone,
        acceptedTerms,
      },
    });

    const cookie = createSessionCookie(professional.id);
    return new Response(
      JSON.stringify({ professional: publicProfessional(professional) }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Set-Cookie": `${cookie.name}=${cookie.value}; HttpOnly; Path=/; Max-Age=${cookie.maxAge}; SameSite=Strict`,
        },
      }
    );
  } catch (e) {
    console.error("[register]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

export { jsonResponse };
