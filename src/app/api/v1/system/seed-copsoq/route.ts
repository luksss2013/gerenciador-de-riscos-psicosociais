import { COPSOQ_DIMENSIONS, COPSOQ_ITEMS } from "@/lib/copsoq-data";
import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/errors";
import { errorJson, jsonResponse } from "@/lib/session";

// Idempotent: if items already seeded, returns counts without re-inserting.
export async function POST() {
  try {
    const itemCount = await db.copsoqItem.count();
    const dimCount = await db.copsoqDimension.count();

    if (itemCount === 0 && dimCount === 0) {
      await db.$transaction([
        db.copsoqDimension.createMany({
          data: COPSOQ_DIMENSIONS.map((d) => ({
            code: d.code,
            namePtBr: d.namePtBr,
            groupName: d.groupName,
            itemCount: d.itemCount,
            direction: d.direction,
            descriptionPtBr: d.descriptionPtBr,
            mteFactorsCovered: d.mteFactorsCovered.join(","),
          })),
        }),
        db.copsoqItem.createMany({
          data: COPSOQ_ITEMS.map((i) => ({
            index: i.index,
            dimensionCode: i.dimensionCode,
            textPtBr: i.textPtBr,
            responseType: i.responseType,
            orderInDimension: i.orderInDimension,
          })),
        }),
      ]);

      const items = await db.copsoqItem.count();
      const dimensions = await db.copsoqDimension.count();
      return jsonResponse({ items, dimensions, seeded: true });
    }

    return jsonResponse({
      items: itemCount,
      dimensions: dimCount,
      seeded: false,
    });
  } catch (e) {
    console.error("[seed-copsoq POST]", e);
    return errorJson(ERROR_CODES.INTERNAL_ERROR, "Internal error");
  }
}
