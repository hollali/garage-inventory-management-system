import "server-only";

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, saleItems, sales, shops } from "@/db/schema";

export type DayRevenue = {
  date: string;
  cents: number;
};

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDaySeries(days: number, rows: DayRevenue[]): DayRevenue[] {
  const byDate = new Map(rows.map((r) => [r.date, r.cents]));
  const series: DayRevenue[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dateKey(d);
    series.push({ date: key, cents: byDate.get(key) ?? 0 });
  }
  return series;
}

const completeSales = eq(sales.status, "complete");

export async function getRevenueByDay(days = 14): Promise<DayRevenue[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`to_char(${sales.createdAt}, 'YYYY-MM-DD')`,
      cents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
    })
    .from(sales)
    .where(and(completeSales, gte(sales.createdAt, since)))
    .groupBy(sql`to_char(${sales.createdAt}, 'YYYY-MM-DD')`);

  return buildDaySeries(
    days,
    rows.map((r) => ({ date: r.date, cents: Number(r.cents ?? 0) })),
  );
}

export async function getRevenueByDayForShop(shopId: string, days = 14): Promise<DayRevenue[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      date: sql<string>`to_char(${sales.createdAt}, 'YYYY-MM-DD')`,
      cents: sql<number>`coalesce(sum(${sales.totalCents}), 0)`,
    })
    .from(sales)
    .where(and(completeSales, eq(sales.shopId, shopId), gte(sales.createdAt, since)))
    .groupBy(sql`to_char(${sales.createdAt}, 'YYYY-MM-DD')`);

  return buildDaySeries(
    days,
    rows.map((r) => ({ date: r.date, cents: Number(r.cents ?? 0) })),
  );
}

export type TopSeller = {
  itemName: string;
  quantity: number;
  revenueCents: number;
};

export async function getTopSellers(limit = 10): Promise<TopSeller[]> {
  const rows = await db
    .select({
      itemName: saleItems.itemName,
      quantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
      revenueCents: sql<number>`coalesce(sum(${saleItems.unitPriceCents} * ${saleItems.quantity}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .where(completeSales)
    .groupBy(saleItems.itemName)
    .orderBy(desc(sql`coalesce(sum(${saleItems.quantity}), 0)`))
    .limit(limit);

  return rows.map((r) => ({
    itemName: r.itemName,
    quantity: Number(r.quantity ?? 0),
    revenueCents: Number(r.revenueCents ?? 0),
  }));
}

export type CategoryBreakdown = {
  category: string;
  revenueCents: number;
};

export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  const rows = await db
    .select({
      category: inventoryItems.category,
      revenueCents: sql<number>`coalesce(sum(${saleItems.unitPriceCents} * ${saleItems.quantity}), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .leftJoin(inventoryItems, eq(inventoryItems.id, saleItems.itemId))
    .where(completeSales)
    .groupBy(inventoryItems.category)
    .orderBy(desc(sql`coalesce(sum(${saleItems.unitPriceCents} * ${saleItems.quantity}), 0)`));

  return rows.map((r) => ({
    category: r.category ?? "General",
    revenueCents: Number(r.revenueCents ?? 0),
  }));
}

export type ReorderSuggestion = {
  itemId: string;
  itemName: string;
  shopId: string | null;
  shopName: string | null;
  category: string;
  quantity: number;
  lowStockThreshold: number;
  suggestedQuantity: number;
  sales30Day: number;
  unitPriceCents: number;
};

export async function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [items, sales30] = await Promise.all([
    db
      .select({ item: inventoryItems, shopName: shops.name })
      .from(inventoryItems)
      .leftJoin(shops, eq(shops.id, inventoryItems.shopId))
      .where(sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockThreshold}`)
      .orderBy(sql`(${inventoryItems.quantity} - ${inventoryItems.lowStockThreshold})`, inventoryItems.name),
    db
      .select({
        itemId: saleItems.itemId,
        qty: sql<number>`coalesce(sum(${saleItems.quantity}), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(sales.id, saleItems.saleId))
      .where(and(completeSales, gte(sales.createdAt, since)))
      .groupBy(saleItems.itemId),
  ]);

  const salesMap = new Map(sales30.map((r) => [r.itemId, Number(r.qty ?? 0)]));

  return items.map(({ item, shopName }) => ({
    itemId: item.id,
    itemName: item.name,
    shopId: item.shopId,
    shopName: shopName ?? null,
    category: item.category,
    quantity: item.quantity,
    lowStockThreshold: item.lowStockThreshold,
    suggestedQuantity: Math.max(0, item.lowStockThreshold - item.quantity),
    sales30Day: salesMap.get(item.id) ?? 0,
    unitPriceCents: item.unitPriceCents,
  }));
}

export type MarginRow = {
  itemId: string;
  itemName: string;
  shopId: string | null;
  shopName: string | null;
  category: string;
  quantity: number;
  unitPriceCents: number;
  costCents: number;
  marginCents: number;
  retailValueCents: number;
  costValueCents: number;
  potentialMarginCents: number;
};

async function marginRows(): Promise<MarginRow[]> {
  const rows = await db
    .select({ item: inventoryItems, shopName: shops.name })
    .from(inventoryItems)
    .leftJoin(shops, eq(shops.id, inventoryItems.shopId))
    .orderBy(inventoryItems.name);

  return rows.map(({ item, shopName }) => ({
    itemId: item.id,
    itemName: item.name,
    shopId: item.shopId,
    shopName: shopName ?? null,
    category: item.category,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    costCents: item.costCents,
    marginCents: item.unitPriceCents - item.costCents,
    retailValueCents: item.unitPriceCents * item.quantity,
    costValueCents: item.costCents * item.quantity,
    potentialMarginCents: (item.unitPriceCents - item.costCents) * item.quantity,
  }));
}

export async function getInventoryMarginSummary() {
  const [agg, rows] = await Promise.all([
    db
      .select({
        retailValueCents: sql<number>`coalesce(sum(${inventoryItems.unitPriceCents} * ${inventoryItems.quantity}), 0)`,
        costValueCents: sql<number>`coalesce(sum(${inventoryItems.costCents} * ${inventoryItems.quantity}), 0)`,
        potentialMarginCents: sql<number>`coalesce(sum((${inventoryItems.unitPriceCents} - ${inventoryItems.costCents}) * ${inventoryItems.quantity}), 0)`,
      })
      .from(inventoryItems),
    marginRows(),
  ]);

  const topItems = rows.slice().sort((a, b) => b.potentialMarginCents - a.potentialMarginCents).slice(0, 5);

  return {
    retailValueCents: Number(agg[0]?.retailValueCents ?? 0),
    costValueCents: Number(agg[0]?.costValueCents ?? 0),
    potentialMarginCents: Number(agg[0]?.potentialMarginCents ?? 0),
    topItems,
  };
}

export async function getInventoryMarginRows(): Promise<MarginRow[]> {
  return marginRows();
}

export async function getTotalRevenueCents(): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${sales.totalCents}), 0)` })
    .from(sales)
    .where(completeSales);
  return Number(row?.total ?? 0);
}
