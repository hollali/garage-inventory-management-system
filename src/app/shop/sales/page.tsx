import { requireAttendantShop } from "@/lib/dal";
import { getSalesPage, getSalesSummary, getShopInventory } from "@/lib/queries";
import { getSaleReceipt, type SaleReceipt } from "@/lib/queries/sales";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { SalesFilter } from "@/components/sales/sales-filter";
import { SaleModal } from "@/components/sales/sale-modal";
import { SaleRowActions } from "@/components/sales/sale-row-actions";
import { CustomerHistoryModal } from "@/components/sales/customer-history-modal";
import { Pagination } from "@/components/ui/pagination";
import { SortableTh } from "@/components/ui/sortable-th";
import { StatCard } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Plus, TrendingUp, Calendar, Clock, Flag } from "lucide-react";

const paymentLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mobile: "Mobile money",
  other: "Other",
};

export default async function ShopSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const shop = await requireAttendantShop();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  const [summary, data, inventory] = await Promise.all([
    getSalesSummary(shop.id),
    getSalesPage(shop.id, {
      page,
      pageSize,
      q: params.q,
      sort: params.sort,
      dir: params.dir,
    }),
    getShopInventory(shop.id),
  ]);

  const saleOptions = inventory.map((item) => ({
    id: item.id,
    name: item.name,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
  }));

  const rows = (
    await Promise.all(
      data.rows.map(async (sale) => {
        const receipt = await getSaleReceipt(shop.id, sale.id);
        return receipt ? { sale, receipt } : null;
      }),
    )
  ).filter((d): d is { sale: (typeof data.rows)[number]; receipt: SaleReceipt } => d !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Sales</h1>
          <p className="text-sm text-muted">{shop.name}</p>
        </div>
        <SaleModal
          items={saleOptions}
          urlAction="record"
          trigger={
            <Button>
              <Plus className="size-4" /> Record sale
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue today" value={formatMoney(summary.todayCents)} icon={<TrendingUp className="size-5" />} accent="success" />
        <StatCard label="This week" value={formatMoney(summary.weekCents)} icon={<Calendar className="size-5" />} />
        <StatCard label="This month" value={formatMoney(summary.monthCents)} icon={<Clock className="size-5" />} />
        <StatCard label="All time" value={formatMoney(summary.allTimeCents)} icon={<Flag className="size-5" />} />
      </div>

      <SalesFilter />

      {rows.length === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No sales found"
          description={
            params.q
              ? "Try adjusting your search."
              : "When you record a sale it will appear here."
          }
          action={
            !params.q ? (
              <SaleModal
                items={saleOptions}
                trigger={<Button>Record your first sale</Button>}
              />
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  Transaction
                </th>
                <SortableTh base="/shop/sales" params={params} column="customer" label="Customer" />
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  Payment
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  Status
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  Vehicle
                </th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  Date
                </th>
                <SortableTh base="/shop/sales" params={params} column="total" label="Total" align="right" />
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {rows.map(({ sale, receipt }) => (
                <SaleRow key={sale.id} sale={sale} receipt={receipt} shopName={shop.name} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination base="/shop/sales" page={page} totalPages={data.totalPages} total={data.total} pageSize={pageSize} />
    </div>
  );
}

function SaleRow({
  sale,
  receipt,
  shopName,
}: {
  sale: { attendantName: string | null } & (typeof receipt)["sale"];
  receipt: SaleReceipt;
  shopName: string;
}) {
  return (
    <tr>
      <td className="p-0 align-top">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
            <span className="font-mono text-xs font-medium text-zinc-500 dark:text-zinc-400">
              #{sale.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-xs text-muted transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="bg-zinc-50/60 dark:bg-zinc-800/40 px-4 py-3">
            <ul className="space-y-1">
              {receipt.items.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {line.quantity} × {line.itemName}
                  </span>
                  <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                    {formatMoney(line.unitPriceCents * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              {sale.attendantName ? `Processed by ${sale.attendantName}` : "Attendant unavailable"}
            </p>
          </div>
        </details>
      </td>
      <td>
        {sale.customerName ? (
          <>
            <CustomerHistoryModal
              customerName={sale.customerName}
              trigger={
                <button
                  type="button"
                  className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-brand"
                >
                  {sale.customerName}
                </button>
              }
            />
            {sale.customerContact && (
              <span className="block text-xs text-muted">{sale.customerContact}</span>
            )}
          </>
        ) : (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Walk-in customer</span>
        )}
      </td>
      <td>
        <Badge variant="neutral">
          {paymentLabels[sale.paymentMethod] ?? sale.paymentMethod}
        </Badge>
      </td>
      <td>
        {sale.status === "refunded" ? (
          <Badge variant="danger">Refunded</Badge>
        ) : (
          <Badge variant="success">Complete</Badge>
        )}
      </td>
      <td>
        {sale.vehicleReg ? (
          <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">{sale.vehicleReg}</span>
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
        )}
      </td>
      <td className="text-xs text-muted">{formatDateTime(sale.createdAt)}</td>
      <td className="text-right">
        <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {formatMoney(sale.totalCents)}
        </span>
      </td>
      <td className="text-right">
        <SaleRowActions
          saleId={sale.id}
          status={sale.status}
          receipt={receipt}
          shopName={shopName}
        />
      </td>
    </tr>
  );
}
