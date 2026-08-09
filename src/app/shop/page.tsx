import Link from "next/link";
import { requireAttendantShop } from "@/lib/dal";
import {
  getItemCategories,
  getLowStockItems,
  getRecentSales,
  getShopInventory,
  getShopStats,
} from "@/lib/queries";
import { getTransferRequests } from "@/lib/queries/transfers";
import { getWorkOrders } from "@/lib/queries/work-orders";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { ItemModal } from "@/components/inventory/item-modal";
import { SaleModal } from "@/components/sales/sale-modal";
import { StatCard } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LowStockBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AttentionCard } from "@/components/ui/attention-card";
import { FiPackage, FiDollarSign, FiAlertTriangle, FiTrendingUp, FiRepeat, FiTool } from "react-icons/fi";

export default async function ShopDashboardPage() {
  const shop = await requireAttendantShop();
  const [stats, lowStock, recentSales, categories, inventory, pendingTransfers, openWorkOrders] =
    await Promise.all([
      getShopStats(shop.id),
      getLowStockItems(shop.id, 6),
      getRecentSales(shop.id, 8),
      getItemCategories(shop.id),
      getShopInventory(shop.id),
      getTransferRequests({ status: "pending", pageSize: 100 }),
      getWorkOrders(shop.id, { status: "open", pageSize: 50 }),
    ]);

  const shopTransfers = pendingTransfers.rows.filter(
    (transfer) => transfer.fromShopId === shop.id || transfer.toShopId === shop.id,
  );

  const saleOptions = inventory.map((item) => ({
    id: item.id,
    name: item.name,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {shop.name}
          </h1>
          <p className="text-sm text-muted">{shop.location}</p>
        </div>
        <div className="flex gap-2">
          <ItemModal
            categories={categories}
            trigger={<Button>Add item</Button>}
          />
          <SaleModal items={saleOptions} trigger={<Button variant="outline">Record sale</Button>} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Inventory items"
          value={stats.itemCount}
          icon={<FiPackage className="size-5" />}
        />
        <StatCard
          label="Inventory value"
          value={formatMoney(stats.inventoryValueCents)}
          icon={<FiDollarSign className="size-5" />}
        />
        <StatCard
          label="Low stock items"
          value={stats.lowStockCount}
          icon={<FiAlertTriangle className="size-5" />}
          accent={stats.lowStockCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Revenue today"
          value={formatMoney(stats.todayRevenueCents)}
          icon={<FiTrendingUp className="size-5" />}
          accent="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AttentionCard
          title="Pending transfers"
          href="/shop/transfers"
          hrefLabel="Manage transfers"
          count={shopTransfers.length}
          icon={<FiRepeat className="size-4" />}
          rows={shopTransfers.slice(0, 3).map((transfer) => {
            const incoming = transfer.toShopId === shop.id;
            return {
              id: transfer.id,
              label: incoming
                ? `Incoming from ${transfer.fromShopName ?? "shop"}`
                : `Outgoing to ${transfer.toShopName ?? "shop"}`,
              meta: formatDateTime(transfer.createdAt),
            };
          })}
        />
        <AttentionCard
          title="Open work orders"
          href="/shop/work-orders"
          hrefLabel="View work orders"
          count={openWorkOrders.total}
          icon={<FiTool className="size-4" />}
          rows={openWorkOrders.rows.slice(0, 3).map((order) => ({
            id: order.id,
            label: order.vehicleReg || order.customerName || "Work order",
            meta: order.vehicleReg
              ? `${order.customerName ?? "Customer"} · ${formatDateTime(order.createdAt)}`
              : formatDateTime(order.createdAt),
          }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Low stock</CardTitle>
            <Link
              href="/shop/items"
              className="text-xs font-medium text-brand hover:text-brand-hover"
            >
              View inventory
            </Link>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <EmptyState title="All stocked up" description="No items are below their threshold." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {lowStock.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-muted">
                        {item.quantity} on hand · threshold {item.lowStockThreshold}
                      </p>
                    </div>
                    <LowStockBadge quantity={item.quantity} threshold={item.lowStockThreshold} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent sales</CardTitle>
            <Link
              href="/shop/sales"
              className="text-xs font-medium text-brand hover:text-brand-hover"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <EmptyState title="No sales yet" description="Record your first sale to get started." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <li key={sale.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {sale.customerName || "Walk-in customer"}
                      </p>
                      <p className="text-xs text-muted">{formatDateTime(sale.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{sale.id.slice(0, 8).toUpperCase()}</Badge>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatMoney(sale.totalCents)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
