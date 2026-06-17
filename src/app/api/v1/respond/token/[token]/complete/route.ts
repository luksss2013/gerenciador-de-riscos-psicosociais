import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { workerErrorJson, workerJsonResponse } from "@/lib/session";

interface RouteCtx {
  params: Promise<{ token: string }>;
}

export async function POST(_request: Request, { params }: RouteCtx) {
  try {
    const { token } = await params;
    const rt = await db.responseToken.findUnique({
      where: { token },
      include: { assessmentDepartment: true },
    });
    if (!rt) {
      return workerErrorJson(ERROR_CODES.TOKEN_INVALID, "Token not found");
    }
    if (rt.isUsed) {
      return workerErrorJson(ERROR_CODES.TOKEN_ALREADY_USED, "Token already used");
    }

    const answeredCount = await db.responseAnswer.count({
      where: { tokenId: rt.id },
    });
    if (answeredCount < 40) {
      return workerErrorJson(
        ERROR_CODES.VALIDATION_ERROR,
        "INCOMPLETE_ANSWERS",
        { answeredCount, totalItems: 40 }
      );
    }

    // Mark used
    await db.responseToken.update({
      where: { id: rt.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    // Increment responseCount, set isEligible if >= 5
    const newCount = rt.assessmentDepartment.responseCount + 1;
    await db.assessmentDepartment.update({
      where: { id: rt.assessmentDepartment.id },
      data: {
        responseCount: { increment: 1 },
        ...(newCount >= 5 && !rt.assessmentDepartment.isEligible
          ? { isEligible: true }
          : {}),
      },
    });

    return workerJsonResponse({ message: "Obrigado pela sua participação" });
  } catch (e) {
    console.error("[respond/complete POST]", e);
    return workerErrorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
