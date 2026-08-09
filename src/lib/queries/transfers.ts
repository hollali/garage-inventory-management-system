import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { shops, transferRequests, transferRequestStatusEnum, users } from "@/db/schema";
import type { ListPage } from "@/lib/queries";

const fromShop = alias(shops, "from_shop");
const toShop = alias(shops, "to_shop");
const requester = alias(users, "requester");

export type TransferRequestStatus = (typeof transferRequestStatusEnum)["enumValues"][number];

export type TransferRequestRow = typeof transferRequests.$inferSelect & {
  fromShopName: string | null;
  toShopName: string | null;
  requesterName: string | null;
};

function selectTransferRows() {
  return db
    .select({
      request: transferRequests,
      fromShopName: fromShop.name,
      toShopName: toShop.name,
      requesterName: requester.name,
    })
    .from(transferRequests)
    .innerJoin(fromShop, eq(fromShop.id, transferRequests.fromShopId))
    .leftJoin(toShop, eq(toShop.id, transferRequests.toShopId))
    .leftJoin(requester, eq(requester.id, transferRequests.requestedBy));
}

function mapRow(row: {
  request: typeof transferRequests.$inferSelect;
  fromShopName: string;
  toShopName: string | null;
  requesterName: string | null;
}): TransferRequestRow {
  return {
    ...row.request,
    fromShopName: row.fromShopName,
    toShopName: row.toShopName ?? null,
    requesterName: row.requesterName ?? null,
  };
}

export async function getTransferRequests(opts: {
  shopId?: string;
  status?: TransferRequestStatus;
  page?: number;
  pageSize?: number;
} = {}): Promise<ListPage<TransferRequestRow>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 10;
  const conditions = [];
  if (opts.shopId) conditions.push(eq(transferRequests.fromShopId, opts.shopId));
  if (opts.status) conditions.push(eq(transferRequests.status, opts.status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [totalRow, rows] = await Promise.all([
    db.select({ count: count() }).from(transferRequests).where(where),
    selectTransferRows()
      .where(where)
      .orderBy(desc(transferRequests.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  return {
    rows: rows.map(mapRow),
    total: totalRow[0].count,
    page,
    totalPages: Math.max(1, Math.ceil(totalRow[0].count / pageSize)),
    pageSize,
  };
}

export async function getTransferRequestById(id: string): Promise<TransferRequestRow | null> {
  const [row] = await selectTransferRows()
    .where(eq(transferRequests.id, id))
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function getShopsForTransfers() {
  return db.select({ id: shops.id, name: shops.name }).from(shops).orderBy(shops.name);
}
