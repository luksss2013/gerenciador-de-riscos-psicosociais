import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { errorJson, jsonResponse } from "@/lib/session";

interface RouteCtx {
  params: Promise<{ token: string }>;
}

interface AnswerBody {
  itemIndex?: unknown;
  likertValue?: unknown;
}

export async function POST(request: Request, { params }: RouteCtx) {
  try {
    const { token } = await params;
    const rt = await db.responseToken.findUnique({ where: { token } });
    if (!rt) {
      return errorJson(ERROR_CODES.TOKEN_INVALID, "Token not found");
    }
    if (rt.isUsed) {
      return errorJson(ERROR_CODES.TOKEN_ALREADY_USED, "Token already used");
    }

    const body = (await request.json()) as AnswerBody;
    const itemIndex =
      typeof body.itemIndex === "number" && Number.isInteger(body.itemIndex)
        ? body.itemIndex
        : NaN;
    const likertValue =
      typeof body.likertValue === "number" && Number.isInteger(body.likertValue)
        ? body.likertValue
        : NaN;
    if (itemIndex < 1 || itemIndex > 40) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "itemIndex must be 1..40");
    }
    if (likertValue < 1 || likertValue > 5) {
      return errorJson(ERROR_CODES.VALIDATION_ERROR, "likertValue must be 1..5");
    }

    // Upsert (unique token+itemIndex): delete existing then insert (SQLite-safe)
    await db.$transaction([
      db.responseAnswer.deleteMany({
        where: { tokenId: rt.id, itemIndex },
      }),
      db.responseAnswer.create({
        data: { tokenId: rt.id, itemIndex, likertValue },
      }),
    ]);

    const answeredCount = await db.responseAnswer.count({
      where: { tokenId: rt.id },
    });

    return jsonResponse({ ok: true, answeredCount, totalItems: 40 });
  } catch (e) {
    console.error("[respond/answer POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
