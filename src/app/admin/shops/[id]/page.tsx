import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { getShopDetail } from "@/lib/queries";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { deleteShop, getAttendantsNotInShop } from "@/lib/actions/admin";
import { ConfirmAction } from "@/components/confirm-action";
import {
  AttendantsManager,
  type AttendantCandidate,
} from "@/components/shops/attendants-manager";
import { StatCard } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LowStockBadge, Badge } from "@/components/ui/badge";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { Banknote, Package, AlertTriangle, TrendingUp, ArrowLeft, ArrowRight } from "lucide-react";

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const data = await getShopDetail(id);
  if (!data) notFound();

  const { shop, attendants, stats, recentSales, inventoryValueCents } = data;
  const currentIds = new Set(attendants.map((a) => a.id));
  const candidates: AttendantCandidate[] = (await getAttendantsNotInShop(shop.id))
    .filter((c) => c.active && !currentIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      username: c.username,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/shops" className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
          <ArrowLeft className="size-4" aria-hidden />
          Back to shops
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
        <StatCard label="Inventory value" value={formatMoney(inventoryValueCents)} icon={<Banknote className="size-5" />} />
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
              <Link
                href="/admin/inventory"
                className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
              >
                Admin
                <ArrowRight className="size-3.5" aria-hidden />
                Inventory
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
                    <TH className="hidden md:table-cell">Category</TH>
                    <TH className="text-right">Price</TH>
                    <TH className="text-right">Qty</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.inventory.map((item) => (
                    <TR key={item.id}>
                      <TD className="font-medium truncate text-zinc-900 dark:text-zinc-100">{item.name}</TD>
                      <TD className="hidden md:table-cell">
                        <Badge variant="neutral">{item.category}</Badge>
                      </TD>
                      <TD className="text-right whitespace-nowrap tabular-nums">{formatMoney(item.unitPriceCents)}</TD>
                      <TD className="text-right whitespace-nowrap tabular-nums">{item.quantity}</TD>
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
              <CardTitle>Attendants</CardTitle>
              <CardDescription>Attendants can be assigned to one or more shops.</CardDescription>
            </CardHeader>
            <CardContent>
              <AttendantsManager
                shopId={shop.id}
                attendants={attendants}
                candidates={candidates}
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
