import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { workerErrorJson, workerJsonResponse } from "@/lib/session";

interface RouteCtx {
  params: Promise<{ assessmentDeptId: string }>;
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const { assessmentDeptId } = await params;
    const ad = await db.assessmentDepartment.findUnique({
      where: { id: assessmentDeptId },
      include: { assessment: true },
    });
    if (!ad) {
      return workerErrorJson(
        ERROR_CODES.ASSESSMENT_DEPT_NOT_FOUND,
        "Assessment department not found",
      );
    }

    // Validate assessment.status = 'collecting' AND endDate >= today
    if (ad.assessment.status !== "collecting") {
      return workerErrorJson(
        ERROR_CODES.ASSESSMENT_NOT_COLLECTING,
        "Assessment is not collecting responses",
      );
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = ad.assessment.endDate;
    if (!endDate || endDate.getTime() < today.getTime()) {
      return workerErrorJson(ERROR_CODES.ASSESSMENT_NOT_COLLECTING, "Assessment window has closed");
    }

    // Create new ResponseToken
    const token = crypto.randomUUID();
    await db.responseToken.create({
      data: {
        assessmentDepartmentId: ad.id,
        token,
        isUsed: false,
      },
    });

    return workerJsonResponse({
      token,
      redirectUrl: `/?worker=${token}`,
    });
  } catch (e) {
    console.error("[respond/dept GET]", e);
    return workerErrorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
