import "server-only";

import { and, count, desc, eq, gte, gt, inArray, isNull, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLog,
  inventoryItems,
  saleItems,
  sales,
  shops,
  stockMovements,
  users,
} from "@/db/schema";

export type ShopSummary = {
  shop: typeof shops.$inferSelect;
  attendantName: string | null;
  itemCount: number;
  lowStockCount: number;
  inventoryValueCents: number;
  revenueCents: number;
};

export async function getShopStats(shopId: string) {
  const [[items], [value], [low], [today]] = await Promise.all([
    db
      .select({ count: count() })
      .from(inventoryItems)
      .where(eq(inventoryItems.shopId, shopId)),
    db
      .select({
        total: sql<number>`coalesce(sum(${inventoryItems.unitPriceCents} * ${inventoryItems.quantity}), 0)`,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.shopId, shopId)),
    db
      .select({ count: count() })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.shopId, shopId),
          sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockThreshold}`,
        ),
      ),
    db
      .select({ total: sql<number>`coalesce(sum(${sales.totalCents}), 0)` })
      .from(sales)
      .where(
        and(
          eq(sales.shopId, shopId),
          gte(sales.createdAt, sql`date_trunc('day', now())`),
        ),
      ),
  ]);

  return {
    itemCount: items.count,
    inventoryValueCents: Number(value.total ?? 0),
    lowStockCount: low.count,
    todayRevenueCents: Number(today.total ?? 0),
  };
}

export async function getLowStockItems(shopId: string, limit = 10) {
  return db
    .select()
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.shopId, shopId),
        sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockThreshold}`,
      ),
    )
    .orderBy(inventoryItems.quantity)
    .limit(limit);
}

export async function getRecentSales(shopId: string, limit = 10) {
  return db
    .select()
    .from(sales)
    .where(eq(sales.shopId, shopId))
    .orderBy(desc(sales.createdAt))
    .limit(limit);
}

export async function getSalesSummary(shopId: string) {
  const [today, week, month, all] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${sales.totalCents}), 0)` })
      .from(sales)
      .where(
        and(eq(sales.shopId, shopId), gte(sales.createdAt, sql`date_trunc('day', now())`)),
      ),
    db
      .select({ total: sql<number>`coalesce(sum(${sales.totalCents}), 0)` })
      .from(sales)
      .where(
        and(eq(sales.shopId, shopId), gte(sales.createdAt, sql`date_trunc('week', now())`)),
      ),
    db
      .select({ total: sql<number>`coalesce(sum(${sales.totalCents}), 0)` })
      .from(sales)
      .where(
        and(eq(sales.shopId, shopId), gte(sales.createdAt, sql`date_trunc('month', now())`)),
      ),
    db
      .select({ total: sql<number>`coalesce(sum(${sales.totalCents}), 0)` })
      .from(sales)
      .where(eq(sales.shopId, shopId)),
  ]);

  return {
    todayCents: Number(today[0]?.total ?? 0),
    weekCents: Number(week[0]?.total ?? 0),
    monthCents: Number(month[0]?.total ?? 0),
    allTimeCents: Number(all[0]?.total ?? 0),
  };
}

export async function getSaleWithItems(saleId: string, shopId: string) {
  const [sale] = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.shopId, shopId)))
    .limit(1);
  if (!sale) return null;
  const items = await db
    .select()
    .from(saleItems)
    .where(eq(saleItems.saleId, sale.id))
    .orderBy(saleItems.itemName);
  return { sale, items };
}

export async function getShopInventory(shopId: string, opts?: { q?: string; category?: string }) {
  const conditions = [eq(inventoryItems.shopId, shopId)];
  if (opts?.q) {
    conditions.push(
      or(
        like(inventoryItems.name, `%${opts.q}%`),
        like(inventoryItems.sku ?? "", `%${opts.q}%`),
        like(inventoryItems.category, `%${opts.q}%`),
      )!,
    );
  }
  if (opts?.category && opts.category !== "All") {
    conditions.push(eq(inventoryItems.category, opts.category));
  }
  return db
    .select()
    .from(inventoryItems)
    .where(and(...conditions))
    .orderBy(inventoryItems.name);
}

export async function getItemCategories(shopId: string) {
  const rows = await db
    .selectDistinct({ category: inventoryItems.category })
    .from(inventoryItems)
    .where(eq(inventoryItems.shopId, shopId))
    .orderBy(inventoryItems.category);
  return rows.map((r) => r.category);
}

export async function getItemWithMovements(shopId: string, itemId: string) {
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.shopId, shopId)))
    .limit(1);
  if (!item) return null;
  const movements = await db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.itemId, item.id))
    .orderBy(desc(stockMovements.createdAt));
  return { item, movements };
}

export async function getSalesLog(shopId: string) {
  const rows = await db
    .select()
    .from(sales)
    .where(eq(sales.shopId, shopId))
    .orderBy(desc(sales.createdAt));
  const attendantIds = [...new Set(rows.map((r) => r.attendantId).filter(Boolean))] as string[];
  const attendants = attendantIds.length
    ? await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, attendantIds))
    : [];
  const byId = new Map(attendants.map((a) => [a.id, a.name]));
  return rows.map((sale) => ({
    ...sale,
    attendantName: sale.attendantId ? (byId.get(sale.attendantId) ?? "Unknown") : null,
  }));
}

/* ---------- Admin ---------- */

export async function getAdminSummary() {
  const [[shopCount], [itemCount], [value], [revenue], [low]] = await Promise.all([
    db.select({ count: count() }).from(shops),
    db.select({ count: count() }).from(inventoryItems),
    db.select({
      total: sql<number>`coalesce(sum(${inventoryItems.unitPriceCents} * ${inventoryItems.quantity}), 0)`,
    }).from(inventoryItems),
    db.select({ total: sql<number>`coalesce(sum(${sales.totalCents}), 0)` }).from(sales),
    db.select({ count: count() }).from(inventoryItems).where(
      sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockThreshold}`,
    ),
  ]);

  return {
    shopCount: shopCount.count,
    itemCount: itemCount.count,
    inventoryValueCents: Number(value.total ?? 0),
    revenueCents: Number(revenue.total ?? 0),
    lowStockCount: low.count,
  };
}

export async function getShopsWithSummary(): Promise<ShopSummary[]> {
  const shopRows = await db
    .select({
      shop: shops,
      attendantName: users.name,
    })
    .from(shops)
    .leftJoin(users, eq(shops.assignedAttendantId, users.id))
    .orderBy(shops.createdAt);

  if (shopRows.length === 0) return [];

  const shopIds = shopRows.map((r) => r.shop.id);

  const [itemCounts, values, lows, revenues] = await Promise.all([
    db
      .select({ shopId: inventoryItems.shopId, count: count() })
      .from(inventoryItems)
      .where(inArray(inventoryItems.shopId, shopIds))
      .groupBy(inventoryItems.shopId),
    db
      .select({
        shopId: inventoryItems.shopId,
        total: sql<number>`coalesce(sum(${inventoryItems.unitPriceCents} * ${inventoryItems.quantity}), 0)`,
      })
      .from(inventoryItems)
      .where(inArray(inventoryItems.shopId, shopIds))
      .groupBy(inventoryItems.shopId),
    db
      .select({ shopId: inventoryItems.shopId, count: count() })
      .from(inventoryItems)
      .where(
        and(
          inArray(inventoryItems.shopId, shopIds),
          sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockThreshold}`,
        ),
      )
      .groupBy(inventoryItems.shopId),
    db
      .select({ shopId: sales.shopId, total: sql<number>`coalesce(sum(${sales.totalCents}), 0)` })
      .from(sales)
      .where(inArray(sales.shopId, shopIds))
      .groupBy(sales.shopId),
  ]);

  const itemMap = new Map(itemCounts.map((r) => [r.shopId, r.count]));
  const valueMap = new Map(values.map((r) => [r.shopId, Number(r.total ?? 0)]));
  const lowMap = new Map(lows.map((r) => [r.shopId, r.count]));
  const revenueMap = new Map(revenues.map((r) => [r.shopId, Number(r.total ?? 0)]));

  return shopRows.map(({ shop, attendantName }) => ({
    shop,
    attendantName,
    itemCount: itemMap.get(shop.id) ?? 0,
    lowStockCount: lowMap.get(shop.id) ?? 0,
    inventoryValueCents: valueMap.get(shop.id) ?? 0,
    revenueCents: revenueMap.get(shop.id) ?? 0,
  }));
}

export async function getShopDetail(shopId: string) {
  const summaries = await getShopsWithSummary();
  const match = summaries.find((s) => s.shop.id === shopId);
  if (!match) return null;
  const [stats, recentSales, inventory] = await Promise.all([
    getShopStats(shopId),
    getRecentSales(shopId, 15),
    getShopInventory(shopId),
  ]);
  return { ...match, stats, recentSales, inventory };
}

export async function getAttendantList() {
  const rows = await db
    .select({
      user: users,
      shop: shops,
    })
    .from(users)
    .leftJoin(shops, eq(shops.assignedAttendantId, users.id))
    .where(eq(users.role, "attendant"))
    .orderBy(users.createdAt);
  return rows;
}

export async function getAllShops() {
  return db.select({ id: shops.id, name: shops.name }).from(shops).orderBy(shops.name);
}

export async function getActivityLog(opts?: {
  shopId?: string;
  actorId?: string;
  action?: string;
  limit?: number;
}) {
  const conditions = [];
  if (opts?.shopId) conditions.push(eq(activityLog.shopId, opts.shopId));
  if (opts?.actorId) conditions.push(eq(activityLog.actorId, opts.actorId));
  if (opts?.action) conditions.push(eq(activityLog.action, opts.action));

  return db
    .select()
    .from(activityLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activityLog.createdAt))
    .limit(opts?.limit ?? 100);
}

export async function getActivityOptions() {
  const [shops_, users_, actions] = await Promise.all([
    db.select().from(shops).orderBy(shops.name),
    db.select({ id: users.id, name: users.name, role: users.role }).from(users).orderBy(users.name),
    db.selectDistinct({ action: activityLog.action }).from(activityLog).orderBy(activityLog.action),
  ]);
  return { shops: shops_, users: users_, actions: actions.map((a) => a.action) };
}

/* ---------- Listing: filtering, sorting, pagination ---------- */

function sortItemsBy(sort?: string, dir?: string) {
  switch (sort) {
    case "name":
      return dir === "asc" ? inventoryItems.name : desc(inventoryItems.name);
    case "category":
      return dir === "asc" ? inventoryItems.category : desc(inventoryItems.category);
    case "price":
      return dir === "asc" ? inventoryItems.unitPriceCents : desc(inventoryItems.unitPriceCents);
    case "quantity":
      return dir === "asc" ? inventoryItems.quantity : desc(inventoryItems.quantity);
    case "updated":
      return dir === "asc" ? inventoryItems.updatedAt : desc(inventoryItems.updatedAt);
    default:
      return desc(inventoryItems.createdAt);
  }
}

export type ListPage<T> = {
  rows: T[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
};

export async function getShopInventoryPage(
  shopId: string,
  opts: {
    page?: number;
    pageSize?: number;
    q?: string;
    category?: string;
    type?: string;
    sort?: string;
    dir?: string;
  } = {},
): Promise<ListPage<typeof inventoryItems.$inferSelect>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 10;
  const conditions = [eq(inventoryItems.shopId, shopId)];
  if (opts.q) {
    conditions.push(
      or(
        like(inventoryItems.name, `%${opts.q}%`),
        like(inventoryItems.sku ?? "", `%${opts.q}%`),
        like(inventoryItems.category, `%${opts.q}%`),
      )!,
    );
  }
  if (opts.category && opts.category !== "All") {
    conditions.push(eq(inventoryItems.category, opts.category));
  }
  if (opts.type === "low") {
    conditions.push(sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockThreshold}`);
  }
  if (opts.type === "out") {
    conditions.push(eq(inventoryItems.quantity, 0));
  }
  const where = and(...conditions);
  const [totalRow, rows] = await Promise.all([
    db.select({ count: count() }).from(inventoryItems).where(where),
    db
      .select()
      .from(inventoryItems)
      .where(where)
      .orderBy(sortItemsBy(opts.sort, opts.dir))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);
  return {
    rows,
    total: totalRow[0].count,
    page,
    totalPages: Math.max(1, Math.ceil(totalRow[0].count / pageSize)),
    pageSize,
  };
}

export async function getAdminInventoryPage(
  opts: {
    page?: number;
    pageSize?: number;
    q?: string;
    category?: string;
    shopId?: string;
    type?: string;
    sort?: string;
    dir?: string;
  } = {},
): Promise<ListPage<typeof inventoryItems.$inferSelect & { shopName: string | null }>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 10;
  const conditions = [];
  if (opts.q) {
    conditions.push(
      or(
        like(inventoryItems.name, `%${opts.q}%`),
        like(inventoryItems.sku ?? "", `%${opts.q}%`),
        like(inventoryItems.category, `%${opts.q}%`),
      )!,
    );
  }
  if (opts.category && opts.category !== "All") {
    conditions.push(eq(inventoryItems.category, opts.category));
  }
  if (opts.shopId === "none") {
    conditions.push(isNull(inventoryItems.shopId));
  } else if (opts.shopId && opts.shopId !== "All") {
    conditions.push(eq(inventoryItems.shopId, opts.shopId));
  }
  if (opts.type === "low") {
    conditions.push(sql`${inventoryItems.quantity} <= ${inventoryItems.lowStockThreshold}`);
  }
  if (opts.type === "out") {
    conditions.push(eq(inventoryItems.quantity, 0));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [totalRow, rows] = await Promise.all([
    db.select({ count: count() }).from(inventoryItems).where(where),
    db
      .select({ item: inventoryItems, shopName: shops.name })
      .from(inventoryItems)
      .leftJoin(shops, eq(shops.id, inventoryItems.shopId))
      .where(where)
      .orderBy(sortItemsBy(opts.sort, opts.dir))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);
  return {
    rows: rows.map((r) => ({ ...r.item, shopName: r.shopName ?? null })),
    total: totalRow[0].count,
    page,
    totalPages: Math.max(1, Math.ceil(totalRow[0].count / pageSize)),
    pageSize,
  };
}

export async function getAdminItemCategories() {
  const rows = await db
    .selectDistinct({ category: inventoryItems.category })
    .from(inventoryItems)
    .orderBy(inventoryItems.category);
  return rows.map((r) => r.category);
}

export async function getShopsForDistribution() {
  return db.select({ id: shops.id, name: shops.name }).from(shops).orderBy(shops.name);
}

export async function getDistributableItems() {
  const rows = await db
    .select({ item: inventoryItems, shopName: shops.name })
    .from(inventoryItems)
    .leftJoin(shops, eq(shops.id, inventoryItems.shopId))
    .where(gt(inventoryItems.quantity, 0))
    .orderBy(inventoryItems.name);
  return rows.map((r) => ({ ...r.item, shopName: r.shopName ?? null }));
}

export async function getCentralItems() {
  return db
    .select()
    .from(inventoryItems)
    .where(isNull(inventoryItems.shopId))
    .orderBy(inventoryItems.name);
}

export async function getSalesPage(
  shopId: string,
  opts: {
    page?: number;
    pageSize?: number;
    q?: string;
    sort?: string;
    dir?: string;
  } = {},
): Promise<ListPage<typeof sales.$inferSelect & { attendantName: string | null }>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 10;
  const conditions = [eq(sales.shopId, shopId)];
  if (opts.q) {
    conditions.push(
      or(
        like(sales.customerName ?? "", `%${opts.q}%`),
        like(sales.customerContact ?? "", `%${opts.q}%`),
        sql`cast(${sales.totalCents} as text) like ${`%${opts.q}%`}`,
      )!,
    );
  }
  const where = and(...conditions);
  const [totalRow, rows] = await Promise.all([
    db.select({ count: count() }).from(sales).where(where),
    db
      .select({ sale: sales, attendantName: users.name })
      .from(sales)
      .leftJoin(users, eq(users.id, sales.attendantId))
      .where(where)
      .orderBy(
        opts.sort === "customer"
          ? opts.dir === "asc"
            ? sales.customerName
            : desc(sales.customerName)
          : opts.sort === "total"
            ? opts.dir === "asc"
              ? sales.totalCents
              : desc(sales.totalCents)
            : desc(sales.createdAt),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);
  return {
    rows: rows.map((r) => ({ ...r.sale, attendantName: r.attendantName ?? null })),
    total: totalRow[0].count,
    page,
    totalPages: Math.max(1, Math.ceil(totalRow[0].count / pageSize)),
    pageSize,
  };
}

export async function getActivityPage(
  opts: {
    shopId?: string;
    actorId?: string;
    action?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<ListPage<typeof activityLog.$inferSelect>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const conditions = [];
  if (opts.shopId) conditions.push(eq(activityLog.shopId, opts.shopId));
  if (opts.actorId) conditions.push(eq(activityLog.actorId, opts.actorId));
  if (opts.action) conditions.push(eq(activityLog.action, opts.action));
  const where = conditions.length ? and(...conditions) : undefined;
  const [totalRow, rows] = await Promise.all([
    db.select({ count: count() }).from(activityLog).where(where),
    db
      .select()
      .from(activityLog)
      .where(where)
      .orderBy(desc(activityLog.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);
  return {
    rows,
    total: totalRow[0].count,
    page,
    totalPages: Math.max(1, Math.ceil(totalRow[0].count / pageSize)),
    pageSize,
  };
}
