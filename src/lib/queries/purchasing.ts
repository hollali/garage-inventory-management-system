import "server-only";

import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  inventoryItems,
  purchaseOrderItems,
  purchaseOrders,
  shops,
  suppliers,
  users,
} from "@/db/schema";
import type { PurchaseOrder } from "@/db/schema";
import type { ListPage } from "@/lib/queries";

export type SupplierWithCount = typeof suppliers.$inferSelect & {
  purchaseOrderCount: number;
};

export type PurchaseOrderListItem = PurchaseOrder & {
  supplierName: string | null;
  shopName: string | null;
  createdByName: string | null;
};

export type PoItemOption = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  quantity: number;
  unitPriceCents: number;
  costCents: number;
  shopId: string | null;
};

export async function getSuppliers(): Promise<SupplierWithCount[]> {
  const rows = await db
    .select({ supplier: suppliers, purchaseOrderCount: count(purchaseOrders.id) })
    .from(suppliers)
    .leftJoin(purchaseOrders, eq(purchaseOrders.supplierId, suppliers.id))
    .groupBy(suppliers.id)
    .orderBy(suppliers.name);
  return rows.map((r) => ({ ...r.supplier, purchaseOrderCount: r.purchaseOrderCount }));
}

export async function getPurchaseOrders(opts: {
  page?: number;
  pageSize?: number;
  status?: string;
} = {}): Promise<ListPage<PurchaseOrderListItem>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 10;
  const conditions = [];
  if (opts.status) {
    conditions.push(eq(purchaseOrders.status, opts.status as PurchaseOrder["status"]));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [totalRow, rows] = await Promise.all([
    db.select({ count: count() }).from(purchaseOrders).where(where),
    db
      .select({
        po: purchaseOrders,
        supplierName: suppliers.name,
        shopName: shops.name,
        createdByName: users.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .leftJoin(shops, eq(shops.id, purchaseOrders.shopId))
      .leftJoin(users, eq(users.id, purchaseOrders.createdBy))
      .where(where)
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);
  return {
    rows: rows.map((r) => ({
      ...r.po,
      supplierName: r.supplierName ?? null,
      shopName: r.shopName ?? null,
      createdByName: r.createdByName ?? null,
    })),
    total: totalRow[0].count,
    page,
    totalPages: Math.max(1, Math.ceil(totalRow[0].count / pageSize)),
    pageSize,
  };
}

export async function getPurchaseOrderDetail(id: string) {
  const [row] = await db
    .select({
      po: purchaseOrders,
      supplierName: suppliers.name,
      shopName: shops.name,
      createdByName: users.name,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .leftJoin(shops, eq(shops.id, purchaseOrders.shopId))
    .leftJoin(users, eq(users.id, purchaseOrders.createdBy))
    .where(eq(purchaseOrders.id, id))
    .limit(1);
  if (!row) return null;
  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, row.po.id))
    .orderBy(purchaseOrderItems.itemName);
  return {
    po: {
      ...row.po,
      supplierName: row.supplierName ?? null,
      shopName: row.shopName ?? null,
      createdByName: row.createdByName ?? null,
    },
    items,
  };
}

export async function getItemsForPo(shopId?: string | null): Promise<PoItemOption[]> {
  return db
    .select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      category: inventoryItems.category,
      sku: inventoryItems.sku,
      quantity: inventoryItems.quantity,
      unitPriceCents: inventoryItems.unitPriceCents,
      costCents: inventoryItems.costCents,
      shopId: inventoryItems.shopId,
    })
    .from(inventoryItems)
    .where(shopId ? eq(inventoryItems.shopId, shopId) : isNull(inventoryItems.shopId))
    .orderBy(inventoryItems.name);
}

export async function getPurchaseOrderItemsByIds(orderIds: string[]) {
  if (orderIds.length === 0) return [];
  return db
    .select()
    .from(purchaseOrderItems)
    .where(inArray(purchaseOrderItems.purchaseOrderId, orderIds))
    .orderBy(purchaseOrderItems.itemName);
}
