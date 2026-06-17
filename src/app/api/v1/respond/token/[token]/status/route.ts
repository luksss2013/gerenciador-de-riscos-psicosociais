import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { errorJson, jsonResponse } from "@/lib/session";

interface RouteCtx {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const { token } = await params;
    const rt = await db.responseToken.findUnique({
      where: { token },
      include: {
        assessmentDepartment: { include: { assessment: true } },
      },
    });
    if (!rt) {
      return errorJson(ERROR_CODES.TOKEN_INVALID, "Token not found");
    }

    const answeredCount = await db.responseAnswer.count({
      where: { tokenId: rt.id },
    });

    const assessmentOpen =
      rt.assessmentDepartment.assessment.status === "collecting" &&
      (!rt.assessmentDepartment.assessment.endDate ||
        rt.assessmentDepartment.assessment.endDate.getTime() >=
          new Date(new Date().setHours(0, 0, 0, 0)).getTime());

    return jsonResponse({
      valid: true,
      alreadyUsed: rt.isUsed,
      assessmentOpen,
      answeredCount,
      totalItems: 40,
    });
  } catch (e) {
    console.error("[respond/status GET]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
