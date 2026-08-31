import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { getAttendantList, getShopDetail } from "@/lib/queries";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { deleteShop } from "@/lib/actions/admin";
import { ConfirmAction } from "@/components/confirm-action";
import { ReassignForm, type ReassignOption } from "@/components/shops/reassign-form";
import { StatCard } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LowStockBadge, Badge } from "@/components/ui/badge";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { DollarSign, Package, AlertTriangle, TrendingUp } from "lucide-react";

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const data = await getShopDetail(id);
  if (!data) notFound();

  const { shop, attendantName, stats, recentSales, inventoryValueCents } = data;
  const attendants = await getAttendantList();
  const options: ReassignOption[] = attendants
    .filter(({ user }) => user.active)
    .map(({ user, shop: s }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      assignedShopName: s?.name ?? null,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/shops" className="text-sm text-muted hover:text-brand">
          ← Back to shops
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{shop.name}</h1>
            <p className="text-sm text-muted">{shop.location}</p>
            {shop.description && <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">{shop.description}</p>}
          </div>
          <ConfirmAction
            action={deleteShop}
            hiddenFields={{ shopId: shop.id }}
            confirmTitle="Delete this shop?"
            confirmBody={`"${shop.name}" and all of its inventory, sales, and stock history will be permanently deleted. This cannot be undone.`}
            successMessage="Shop deleted"
            redirectTo="/admin/shops"
            buttonProps={{ variant: "danger" }}
          >
            Delete shop
          </ConfirmAction>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Inventory value" value={formatMoney(inventoryValueCents)} icon={<DollarSign className="size-5" />} />
        <StatCard label="Items" value={stats.itemCount} icon={<Package className="size-5" />} />
        <StatCard
          label="Low stock items"
          value={stats.lowStockCount}
          icon={<AlertTriangle className="size-5" />}
          accent={stats.lowStockCount > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Revenue today"
          value={formatMoney(stats.todayRevenueCents)}
          icon={<TrendingUp className="size-5" />}
          accent="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>
              This shop&apos;s current stock. Manage items centrally from{" "}
              <Link href="/admin/inventory" className="font-medium text-brand hover:underline">
                Admin → Inventory
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.itemCount === 0 ? (
              <div className="px-5 py-10">
                <EmptyState icon={<BoxIcon className="size-6" />} title="No inventory yet" />
              </div>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Item</TH>
                    <TH>Category</TH>
                    <TH className="text-right">Price</TH>
                    <TH className="text-right">Qty</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.inventory.map((item) => (
                    <TR key={item.id}>
                      <TD className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</TD>
                      <TD>
                        <Badge variant="neutral">{item.category}</Badge>
                      </TD>
                      <TD className="text-right tabular-nums">{formatMoney(item.unitPriceCents)}</TD>
                      <TD className="text-right tabular-nums">{item.quantity}</TD>
                      <TD>
                        <LowStockBadge quantity={item.quantity} threshold={item.lowStockThreshold} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendant</CardTitle>
              <CardDescription>One attendant per shop.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm">
                Current:{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{attendantName ?? "Unassigned"}</span>
              </p>
              <ReassignForm
                shopId={shop.id}
                currentAttendantId={shop.assignedAttendantId}
                options={options}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent sales</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSales.length === 0 ? (
                <EmptyState title="No sales yet" />
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                  {recentSales.map((sale) => (
                    <li key={sale.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {sale.customerName || "Walk-in customer"}
                        </p>
                        <p className="text-xs text-muted">{formatDateTime(sale.createdAt)}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatMoney(sale.totalCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
