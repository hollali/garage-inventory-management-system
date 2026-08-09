import "server-only";

import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { saleItems, saleReturns, sales, users } from "@/db/schema";

export type SaleReceipt = NonNullable<Awaited<ReturnType<typeof getSaleReceipt>>>;

export async function getSaleReceipt(shopId: string, saleId: string) {
  const [row] = await db
    .select({ sale: sales, attendantName: users.name })
    .from(sales)
    .leftJoin(users, eq(users.id, sales.attendantId))
    .where(and(eq(sales.id, saleId), eq(sales.shopId, shopId)))
    .limit(1);

  if (!row) return null;

  const [items, returns] = await Promise.all([
    db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, saleId))
      .orderBy(saleItems.itemName),
    db
      .select()
      .from(saleReturns)
      .where(eq(saleReturns.saleId, saleId))
      .orderBy(desc(saleReturns.createdAt)),
  ]);

  return {
    sale: { ...row.sale, attendantName: row.attendantName ?? null },
    items,
    returns,
  };
}

export async function getSaleReturns(shopId: string, limit = 20) {
  return db
    .select({
      saleReturn: saleReturns,
      customerName: sales.customerName,
      saleTotalCents: sales.totalCents,
    })
    .from(saleReturns)
    .leftJoin(sales, eq(sales.id, saleReturns.saleId))
    .where(eq(saleReturns.shopId, shopId))
    .orderBy(desc(saleReturns.createdAt))
    .limit(limit);
}

export type CustomerHistoryRow = Awaited<ReturnType<typeof getCustomerHistory>>[number];

export async function getCustomerHistory(shopId: string, customerName: string) {
  return db
    .select({
      id: sales.id,
      createdAt: sales.createdAt,
      totalCents: sales.totalCents,
      status: sales.status,
      paymentMethod: sales.paymentMethod,
      discountCents: sales.discountCents,
      vehicleReg: sales.vehicleReg,
      customerContact: sales.customerContact,
      itemCount: count(saleItems.id),
    })
    .from(sales)
    .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.shopId, shopId),
        sql`lower(${sales.customerName}) = lower(${customerName})`,
      ),
    )
    .groupBy(sales.id)
    .orderBy(desc(sales.createdAt));
}
