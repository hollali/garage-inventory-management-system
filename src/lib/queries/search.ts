import "server-only";

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, sales, shops, workOrders } from "@/db/schema";
import { getShopForAttendant, requireUser } from "@/lib/dal";

export type GlobalSearchEntry = { label: string; sub?: string; href: string };
export type GlobalSearchGroup = { label: string; entries: GlobalSearchEntry[] };

const ITEM_LIMIT = 15;
const CUSTOMER_LIMIT = 10;
const WORK_ORDER_LIMIT = 10;

type ItemRow = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  shop: string | null;
};

type CustomerRow = {
  name: string;
  contact: string | null;
  shop: string | null;
};

type WorkOrderRow = {
  id: string;
  vehicleReg: string | null;
  customerName: string | null;
  status: string;
  shop: string | null;
};

const NO_SHOP = sql<string | null>`null`;

export async function getGlobalSearchData(): Promise<GlobalSearchGroup[]> {
  const session = await requireUser();
  const isAdmin = session.role === "admin";
  const shopId = isAdmin ? null : (await getShopForAttendant(session.id))?.id ?? null;

  const [items, customers, workOrderRows] = await Promise.all([
    isAdmin
      ? (db
          .select({
            id: inventoryItems.id,
            name: inventoryItems.name,
            category: inventoryItems.category,
            sku: inventoryItems.sku,
            shop: shops.name,
          })
          .from(inventoryItems)
          .leftJoin(shops, eq(shops.id, inventoryItems.shopId))
          .orderBy(inventoryItems.name)
          .limit(ITEM_LIMIT) as Promise<ItemRow[]>)
      : (db
          .select({
            id: inventoryItems.id,
            name: inventoryItems.name,
            category: inventoryItems.category,
            sku: inventoryItems.sku,
            shop: NO_SHOP,
          })
          .from(inventoryItems)
          .where(eq(inventoryItems.shopId, shopId as string))
          .orderBy(inventoryItems.name)
          .limit(ITEM_LIMIT) as Promise<ItemRow[]>),
    isAdmin
      ? (db
          .selectDistinctOn([sales.customerName], {
            name: sales.customerName,
            contact: sales.customerContact,
            shop: shops.name,
          })
          .from(sales)
          .leftJoin(shops, eq(shops.id, sales.shopId))
          .where(ne(sales.customerName, ""))
          .orderBy(sales.customerName)
          .limit(CUSTOMER_LIMIT) as Promise<CustomerRow[]>)
      : (db
          .selectDistinctOn([sales.customerName], {
            name: sales.customerName,
            contact: sales.customerContact,
            shop: NO_SHOP,
          })
          .from(sales)
          .where(
            and(ne(sales.customerName, ""), eq(sales.shopId, shopId as string)),
          )
          .orderBy(sales.customerName)
          .limit(CUSTOMER_LIMIT) as Promise<CustomerRow[]>),
    isAdmin
      ? (db
          .select({
            id: workOrders.id,
            vehicleReg: workOrders.vehicleReg,
            customerName: workOrders.customerName,
            status: workOrders.status,
            shop: shops.name,
          })
          .from(workOrders)
          .leftJoin(shops, eq(shops.id, workOrders.shopId))
          .orderBy(desc(workOrders.createdAt))
          .limit(WORK_ORDER_LIMIT) as Promise<WorkOrderRow[]>)
      : (db
          .select({
            id: workOrders.id,
            vehicleReg: workOrders.vehicleReg,
            customerName: workOrders.customerName,
            status: workOrders.status,
            shop: NO_SHOP,
          })
          .from(workOrders)
          .where(eq(workOrders.shopId, shopId as string))
          .orderBy(desc(workOrders.createdAt))
          .limit(WORK_ORDER_LIMIT) as Promise<WorkOrderRow[]>),
  ]);

  const groups: GlobalSearchGroup[] = [];
  const query = (name: string) => `?q=${encodeURIComponent(name)}`;

  if (items.length) {
    groups.push({
      label: "Items",
      entries: items.map((item) => ({
        label: item.name,
        sub: [item.category || "General", item.sku && `SKU ${item.sku}`, isAdmin ? item.shop : null]
          .filter(Boolean)
          .join(" · "),
        href: `${isAdmin ? "/admin/inventory" : "/shop/items"}${query(item.name)}`,
      })),
    });
  }

  if (!isAdmin && customers.length) {
    groups.push({
      label: "Customers",
      entries: customers.map((c) => ({
        label: c.name,
        sub: [c.contact && `Contact ${c.contact}`].filter(Boolean).join(" · "),
        href: `${"/shop/sales"}${query(c.name)}`,
      })),
    });
  }

  if (workOrderRows.length) {
    groups.push({
      label: "Work orders",
      entries: workOrderRows.map((wo) => ({
        label: wo.vehicleReg || wo.customerName || wo.id,
        sub: [wo.customerName && `Customer ${wo.customerName}`, wo.status, isAdmin ? wo.shop : null]
          .filter(Boolean)
          .join(" · "),
        href: isAdmin ? `/admin/work-orders/${wo.id}` : `/shop/work-orders/${wo.id}`,
      })),
    });
  }

  return groups;
}