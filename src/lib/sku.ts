import { like } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";

export function skuPrefix(category: string): string {
  const words = category
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "ITM";
  if (words.length === 1) {
    const w = words[0];
    return (w[0] + (w[1] ?? "X")).toUpperCase();
  }
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

export async function nextSku(category: string): Promise<string> {
  const prefix = skuPrefix(category);
  const rows = await db
    .select({ sku: inventoryItems.sku })
    .from(inventoryItems)
    .where(like(inventoryItems.sku, `${prefix}-%`));

  let max = 0;
  for (const row of rows) {
    const match = row.sku?.match(/(\d+)\s*$/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export async function resolveSku(
  sku: string | undefined,
  category: string,
  existingSku?: string | null,
): Promise<string | null> {
  const trimmed = sku?.trim() ?? "";
  if (trimmed) return trimmed;
  if (existingSku) return existingSku;
  return nextSku(category);
}
