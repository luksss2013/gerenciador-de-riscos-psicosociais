import { COPSOQ_ITEMS, LIKERT_SCALE } from "@/lib/copsoq-data";
import { ERROR_CODES } from "@/lib/errors";
import { workerErrorJson, workerJsonResponse } from "@/lib/session";

interface RouteCtx {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: RouteCtx) {
  try {
    const { token } = await params;
    // Token validity is checked via /status; this endpoint is public for items list.
    // Still expose `token` param via the path; no company/dept info ever returned (RB-03).
    void token;
    return workerJsonResponse({
      items: COPSOQ_ITEMS.map((i) => ({
        index: i.index,
        dimensionCode: i.dimensionCode,
        textPtBr: i.textPtBr,
        responseType: i.responseType,
      })),
      scale: LIKERT_SCALE,
    });
  } catch (e) {
    console.error("[respond/items GET]", e);
    return workerErrorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
