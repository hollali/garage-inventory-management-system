import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { getAdminSummary, getShopsWithSummary } from "@/lib/queries";
import { getTransferRequests } from "@/lib/queries/transfers";
import { getWorkOrders } from "@/lib/queries/work-orders";
import { getPurchaseOrders } from "@/lib/queries/purchasing";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { AttentionCard } from "@/components/ui/attention-card";
import {
  FiBriefcase,
  FiPackage,
  FiDollarSign,
  FiTrendingUp,
  FiRepeat,
  FiTool,
  FiClipboard,
} from "react-icons/fi";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [summary, shops, pendingTransfers, openWorkOrders, draftPurchaseOrders] =
    await Promise.all([
      getAdminSummary(),
      getShopsWithSummary(),
      getTransferRequests({ status: "pending", pageSize: 50 }),
      getWorkOrders(undefined, { status: "open", pageSize: 50 }),
      getPurchaseOrders({ status: "draft", pageSize: 50 }),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-muted">
            Consolidated view across {summary.shopCount} shop
            {summary.shopCount === 1 ? "" : "s"}.
          </p>
        </div>
        <ButtonLink href="/admin/shops">New shop</ButtonLink>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Shops" value={summary.shopCount} icon={<FiBriefcase className="size-5" />} />
        <StatCard label="Total items" value={summary.itemCount} icon={<FiPackage className="size-5" />} />
        <StatCard
          label="Inventory value"
          value={formatMoney(summary.inventoryValueCents)}
          icon={<FiDollarSign className="size-5" />}
        />
        <StatCard
          label="Total revenue"
          value={formatMoney(summary.revenueCents)}
          icon={<FiTrendingUp className="size-5" />}
          accent="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AttentionCard
          title="Pending transfers"
          href="/admin/transfers"
          hrefLabel="Review transfers"
          count={pendingTransfers.total}
          icon={<FiRepeat className="size-4" />}
          rows={pendingTransfers.rows.slice(0, 3).map((transfer) => ({
            id: transfer.id,
            label: `${transfer.fromShopName ?? "Shop"} → ${transfer.toShopName ?? "Shop"}`,
            meta: formatDateTime(transfer.createdAt),
          }))}
        />
        <AttentionCard
          title="Open work orders"
          href="/admin/work-orders"
          hrefLabel="View work orders"
          count={openWorkOrders.total}
          icon={<FiTool className="size-4" />}
          rows={openWorkOrders.rows.slice(0, 3).map((order) => ({
            id: order.id,
            label: order.vehicleReg || order.customerName || order.shopName || "Work order",
            meta: order.shopName ?? "No shop",
          }))}
        />
        <AttentionCard
          title="Purchase orders"
          href="/admin/purchase-orders"
          hrefLabel="Awaiting receipt"
          count={draftPurchaseOrders.total}
          icon={<FiClipboard className="size-4" />}
          rows={draftPurchaseOrders.rows.slice(0, 3).map((order) => ({
            id: order.id,
            label: order.supplierName ?? "No supplier",
            meta: `${formatMoney(order.totalCents)} · ${formatDateTime(order.createdAt)}`,
          }))}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Shops overview</CardTitle>
          <Link
            href="/admin/shops"
            className="text-xs font-medium text-brand hover:text-brand-hover"
          >
            Manage shops
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {shops.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted">
              No shops yet.{" "}
              <Link href="/admin/shops" className="font-medium text-brand hover:text-brand-hover">
                Create the first shop
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {shops.map(({ shop, attendantName, itemCount, lowStockCount, inventoryValueCents, revenueCents }) => (
                <li key={shop.id}>
                  <Link
                    href={`/admin/shops/${shop.id}`}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{shop.name}</p>
                      <p className="truncate text-xs text-muted">
                        {shop.location}
                        {attendantName ? ` · Attendant: ${attendantName}` : " · No attendant"}
                      </p>
                    </div>
                    <div className="hidden gap-2 md:flex">
                      {lowStockCount > 0 && (
                        <Badge variant="warning">{lowStockCount} low stock</Badge>
                      )}
                      <Badge variant="neutral">{itemCount} items</Badge>
                    </div>
                    <div className="hidden w-32 text-right text-sm sm:block">
                      <p className="font-medium tabular-nums text-slate-900">
                        {formatMoney(inventoryValueCents)}
                      </p>
                      <p className="text-xs text-muted">inventory value</p>
                    </div>
                    <div className="w-32 text-right text-sm">
                      <p className="font-medium tabular-nums text-slate-900">
                        {formatMoney(revenueCents)}
                      </p>
                      <p className="text-xs text-muted">revenue</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
