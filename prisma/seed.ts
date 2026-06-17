import { PrismaClient } from "@prisma/client";
import { COPSOQ_DIMENSIONS, COPSOQ_ITEMS } from "../src/lib/copsoq-data";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

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
    console.log(`✅ Seeded: ${items} items, ${dimensions} dimensions.`);
  } else {
    console.log(`ℹ️ Already seeded: ${itemCount} items, ${dimCount} dimensions.`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
