"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inventoryItems, shops, stockMovements } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { logActivity } from "@/lib/activity";
import { resolveSku } from "@/lib/sku";
import { parseCsv } from "@/lib/csv";

const importSchema = z.object({
  csv: z.string().min(1, "Paste some CSV data."),
  shopId: z.string().trim().optional(),
});

export type ImportState = { ok?: boolean; error?: string; created?: number } | undefined;

export async function importItemsCsv(formData: FormData): Promise<ImportState> {
  const admin = await requireAdmin();

  const parsed = importSchema.safeParse({
    csv: formData.get("csv"),
    shopId: formData.get("shopId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const targetShopId = parsed.data.shopId?.trim() || null;
  if (targetShopId) {
    const [shop] = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.id, targetShopId))
      .limit(1);
    if (!shop) return { error: "Selected shop not found." };
  }

  const lines = parseCsv(parsed.data.csv);
  if (lines.length < 2) return { error: "CSV must include a header row and at least one data row." };

  const headers = lines[0].map((h) => h.toLowerCase());
  const col = (name: string) => headers.indexOf(name);

  const iName = col("name");
  if (iName === -1) return { error: 'CSV must include a "name" column.' };

  const iCategory = col("category");
  const iSku = col("sku");
  const iBarcode = col("barcode");
  const iQuantity = col("quantity");
  const iUnitPrice = col("unitprice");
  const iCost = col("cost");
  const iThreshold = col("lowstockthreshold");
  const iDescription = col("description");
  const iUnitName = col("unitname");
  const iItemsPerUnit = col("itemsperunit");

  const toNum = (value: string | undefined, fallback: number): number => {
    if (!value || value.trim() === "") return fallback;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  try {
    const created = await db.transaction(async (tx) => {
      let count = 0;
      for (let r = 1; r < lines.length; r++) {
        const fields = lines[r];
        const name = fields[iName]?.trim() ?? "";
        if (!name) continue;

        const category = fields[iCategory]?.trim() || "General";
        const quantity = Math.floor(toNum(fields[iQuantity], 0));
        const unitPrice = toNum(fields[iUnitPrice], 0);
        const cost = toNum(fields[iCost], 0);
        const lowStockThreshold = Math.floor(toNum(fields[iThreshold], 5));
        const barcode = fields[iBarcode]?.trim() || null;
        const description = fields[iDescription]?.trim() || null;
        const unitName = fields[iUnitName]?.trim() || "piece";
        const itemsPerUnit = Math.max(1, Math.floor(toNum(fields[iItemsPerUnit], 1)));
        const sku = await resolveSku(fields[iSku]?.trim() || undefined, category);

        const [item] = await tx
          .insert(inventoryItems)
          .values({
            shopId: targetShopId,
            name,
            category,
            sku,
            barcode,
            description,
            unitName,
            itemsPerUnit,
            unitPriceCents: Math.round(unitPrice * 100),
            costCents: Math.round(cost * 100),
            lowStockThreshold,
            quantity,
          })
          .returning({ id: inventoryItems.id });

        if (!item) continue;
        count += 1;

        if (quantity > 0) {
          await tx.insert(stockMovements).values({
            itemId: item.id,
            shopId: targetShopId,
            userId: admin.id,
            type: "in",
            reason: "adjustment",
            quantity,
            note: "Imported from CSV",
          });
        }
      }
      return count;
    });

    await logActivity({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: "admin",
      action: "item.import",
      shopId: targetShopId,
      entityType: "item",
      metadata: { created },
    });

    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    return { ok: true, created };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Import failed." };
  }
}
