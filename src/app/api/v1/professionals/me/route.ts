import { db } from "@/lib/db";
import { ERROR_CODES, PROFESSION_TYPES, ProfessionType } from "@/lib/errors";
import {
  errorJson,
  jsonResponse,
  requireProfessional,
} from "@/lib/session";

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

export async function GET() {
  try {
    const professional = await requireProfessional();
    return jsonResponse({ professional: publicProfessional(professional) });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[me GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}

interface PatchBody {
  name?: unknown;
  professionType?: unknown;
  credentialNumber?: unknown;
  phone?: unknown;
}

export async function PATCH(request: Request) {
  try {
    const professional = await requireProfessional();
    const body = (await request.json()) as PatchBody;

    const data: {
      name?: string;
      professionType?: ProfessionType;
      credentialNumber?: string | null;
      phone?: string | null;
    } = {};

    if (typeof body.name === "string" && body.name.trim().length >= 2) {
      data.name = body.name.trim();
    } else if (body.name !== undefined) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "name must be at least 2 chars");
    }

    if (body.professionType !== undefined) {
      if (
        typeof body.professionType !== "string" ||
        !PROFESSION_TYPES.includes(body.professionType as ProfessionType)
      ) {
        return errorJson(ERROR_CODES.VALIDATION_ERROR, "professionType is invalid");
      }
      data.professionType = body.professionType as ProfessionType;
    }

    if (body.credentialNumber !== undefined) {
      data.credentialNumber =
        typeof body.credentialNumber === "string" && body.credentialNumber.trim()
          ? body.credentialNumber.trim()
          : null;
    }

    if (body.phone !== undefined) {
      data.phone =
        typeof body.phone === "string" && body.phone.trim()
          ? body.phone.trim()
          : null;
    }

    const updated = await db.professional.update({
      where: { id: professional.id },
      data,
    });
    return jsonResponse({ professional: publicProfessional(updated) });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === ERROR_CODES.UNAUTHORIZED) {
      return errorJson(ERROR_CODES.UNAUTHORIZED, "Session required");
    }
    console.error("[me PATCH]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
