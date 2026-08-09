import "server-only";

import { and, count, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import {
  inventoryItems,
  shops,
  users,
  workOrderItems,
  workOrders,
  workOrderStatusEnum,
} from "@/db/schema";
import type { ListPage } from "@/lib/queries";

export type WorkOrderStatus = (typeof workOrderStatusEnum)["enumValues"][number];

function isWorkOrderStatus(value: string): value is WorkOrderStatus {
  return (workOrderStatusEnum.enumValues as readonly string[]).includes(value);
}

export type WorkOrderRow = typeof workOrders.$inferSelect & {
  shopName: string | null;
  createdByName: string | null;
};

export async function getWorkOrders(
  shopId?: string,
  opts: { page?: number; pageSize?: number; status?: string } = {},
): Promise<ListPage<WorkOrderRow>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 10;

  const conditions = [];
  if (shopId) conditions.push(eq(workOrders.shopId, shopId));
  if (opts.status && opts.status !== "All" && isWorkOrderStatus(opts.status)) {
    conditions.push(eq(workOrders.status, opts.status));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [totalRow, rows] = await Promise.all([
    db.select({ count: count() }).from(workOrders).where(where),
    db
      .select({
        workOrder: workOrders,
        shopName: shops.name,
        createdByName: users.name,
      })
      .from(workOrders)
      .leftJoin(shops, eq(shops.id, workOrders.shopId))
      .leftJoin(users, eq(users.id, workOrders.createdBy))
      .where(where)
      .orderBy(desc(workOrders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r.workOrder,
      shopName: r.shopName ?? null,
      createdByName: r.createdByName ?? null,
    })),
    total: totalRow[0].count,
    page,
    totalPages: Math.max(1, Math.ceil(totalRow[0].count / pageSize)),
    pageSize,
  };
}

export async function getWorkOrderDetail(id: string) {
  const [row] = await db
    .select({
      workOrder: workOrders,
      shopName: shops.name,
      createdByName: users.name,
    })
    .from(workOrders)
    .leftJoin(shops, eq(shops.id, workOrders.shopId))
    .leftJoin(users, eq(users.id, workOrders.createdBy))
    .where(eq(workOrders.id, id))
    .limit(1);
  if (!row) return null;

  const parts = await db
    .select()
    .from(workOrderItems)
    .where(eq(workOrderItems.workOrderId, id))
    .orderBy(workOrderItems.itemName);

  return {
    workOrder: {
      ...row.workOrder,
      shopName: row.shopName ?? null,
      createdByName: row.createdByName ?? null,
    },
    parts,
  };
}

export async function getItemsForWorkOrder(shopId: string) {
  return db
    .select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      quantity: inventoryItems.quantity,
      unitPriceCents: inventoryItems.unitPriceCents,
    })
    .from(inventoryItems)
    .where(and(eq(inventoryItems.shopId, shopId), gt(inventoryItems.quantity, 0)))
    .orderBy(inventoryItems.name);
}
