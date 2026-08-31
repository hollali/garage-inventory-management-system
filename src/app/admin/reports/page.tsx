import { requireAdmin } from "@/lib/dal";
import { getAllShops } from "@/lib/queries";
import {
  getCategoryBreakdown,
  getInventoryMarginSummary,
  getReorderSuggestions,
  getRevenueByDay,
  getRevenueByDayForShop,
  getTopSellers,
  getTotalRevenueCents,
} from "@/lib/queries/reports";
import { formatMoney } from "@/lib/utils";
import { sendLowStockAlert } from "@/lib/actions/reports";
import { StatCard } from "@/components/ui/stat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { RevenueFilter } from "@/components/reports/revenue-filter";
import { AlertTriangle, Banknote, Download, Percent, ShoppingCart, TrendingUp } from "lucide-react";

function shortDate(date: string): string {
  return date.slice(5).replace("-", "/");
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const shopId = params.shop ?? "";

  const shops = await getAllShops();
  const shop = shopId ? shops.find((s) => s.id === shopId) ?? null : null;

  const [totalRevenue, margin, topSellers, categories, reorder, revenue, revenueForShop] =
    await Promise.all([
      getTotalRevenueCents(),
      getInventoryMarginSummary(),
      getTopSellers(10),
      getCategoryBreakdown(),
      getReorderSuggestions(),
      shop ? null : getRevenueByDay(14),
      shop ? getRevenueByDayForShop(shop.id, 14) : null,
    ]);

  const revenueSeries = (shop ? revenueForShop : revenue) ?? [];
  const periodTotalCents = revenueSeries.reduce((sum, r) => sum + r.cents, 0);

  const revenueChartData = revenueSeries.map((r) => ({
    label: shortDate(r.date),
    value: r.cents,
  }));
  const topSellersChartData = topSellers.map((t) => ({
    label: t.itemName,
    value: t.revenueCents,
  }));
  const categoryChartData = categories.map((c) => ({
    label: c.category,
    value: c.revenueCents,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Reports</h1>
        <p className="text-sm text-muted">
          Revenue analytics, margins, and reorder suggestions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={formatMoney(totalRevenue)}
          icon={<TrendingUp className="size-5" />}
          accent="success"
        />
        <StatCard
          label="Inventory value (retail)"
          value={formatMoney(margin.retailValueCents)}
          icon={<ShoppingCart className="size-5" />}
        />
        <StatCard
          label="Inventory value (cost)"
          value={formatMoney(margin.costValueCents)}
          icon={<Banknote className="size-5" />}
        />
        <StatCard
          label="Potential margin"
          value={formatMoney(margin.potentialMarginCents)}
          icon={<Percent className="size-5" />}
          accent="warning"
        />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Revenue (last 14 days)</CardTitle>
            <CardDescription>
              {shop ? `${shop.name} · ` : "All shops · "}
              {formatMoney(periodTotalCents)} total
            </CardDescription>
          </div>
          <RevenueFilter shops={shops} currentShopId={shopId} />
        </CardHeader>
        <CardContent>
          <LineChart data={revenueChartData} height={260} formatValue={formatMoney} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top sellers</CardTitle>
            <CardDescription>By units sold, ranked by quantity.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {topSellers.length === 0 ? (
              <EmptyState
                title="No sales yet"
                description="Completed sales will appear here."
              />
            ) : (
              <>
                <BarChart
                  data={topSellersChartData}
                  height={180}
                  formatValue={formatMoney}
                />
                <div className="overflow-hidden">
                  <Table>
                    <THead>
                      <TR>
                        <TH>Item</TH>
                        <TH className="text-right">Qty sold</TH>
                        <TH className="text-right">Revenue</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {topSellers.map((t) => (
                        <TR key={t.itemName}>
                          <TD className="font-medium text-zinc-900 dark:text-zinc-100">{t.itemName}</TD>
                          <TD className="text-right tabular-nums">{t.quantity}</TD>
                          <TD className="text-right tabular-nums">{formatMoney(t.revenueCents)}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by category</CardTitle>
            <CardDescription>Revenue grouped by item category.</CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <EmptyState
                title="No sales yet"
                description="Completed sales will appear here."
              />
            ) : (
              <BarChart
                data={categoryChartData}
                height={220}
                formatValue={formatMoney}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Reorder suggestions</CardTitle>
            <CardDescription>
              {reorder.length} item{reorder.length === 1 ? "" : "s"} at or below their
              low-stock threshold.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href="/api/export/report?reorder=1" variant="outline" size="sm">
              <Download className="size-4" /> Export CSV
            </ButtonLink>
            <ConfirmAction
              action={sendLowStockAlert}
              confirmTitle="Send low stock alert?"
              confirmBody="This emails the current low-stock list to all admins."
              successMessage="Low stock alert sent"
              buttonProps={{ variant: "danger", size: "sm" }}
            >
              <AlertTriangle className="size-4" /> Send low stock alert
            </ConfirmAction>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reorder.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState
                title="All stocked up"
                description="No items are below their low-stock thresholds."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Item</TH>
                  <TH>Shop</TH>
                  <TH className="text-right">On hand</TH>
                  <TH className="text-right">Threshold</TH>
                  <TH className="text-right">Suggested</TH>
                  <TH className="text-right">30-day sales</TH>
                </TR>
              </THead>
              <TBody>
                {reorder.map((it) => (
                  <TR key={it.itemId}>
                    <TD>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{it.itemName}</span>
                      <Badge variant="neutral" className="ml-2">
                        {it.category}
                      </Badge>
                    </TD>
                    <TD>
                      {it.shopName ? (
                        <Badge variant="info">{it.shopName}</Badge>
                      ) : (
                        <Badge variant="neutral">Central</Badge>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">{it.quantity}</TD>
                    <TD className="text-right tabular-nums">{it.lowStockThreshold}</TD>
                    <TD className="text-right">
                      {it.suggestedQuantity > 0 ? (
                        <Badge variant="warning">{it.suggestedQuantity}</Badge>
                      ) : (
                        <span className="tabular-nums text-muted">0</span>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">{it.sales30Day}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
