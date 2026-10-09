import { requireAttendantShop } from "@/lib/dal";
import { getSalesPage, getSalesSummary } from "@/lib/queries";
import { getSaleReceipt, type SaleReceipt } from "@/lib/queries/sales";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { SalesFilter } from "@/components/sales/sales-filter";
import { PageHeader } from "@/components/ui/page-header";
import { SaleRowActions } from "@/components/sales/sale-row-actions";
import { CustomerHistoryModal } from "@/components/sales/customer-history-modal";
import { Pagination } from "@/components/ui/pagination";
import { SortableTh } from "@/components/ui/sortable-th";
import { StatCard } from "@/components/ui/stat";
import { ButtonLink } from "@/components/ui/button";
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

  const [summary, data] = await Promise.all([
    getSalesSummary(shop.id),
    getSalesPage(shop.id, {
      page,
      pageSize,
      q: params.q,
      sort: params.sort,
      dir: params.dir,
    }),
  ]);

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
      <PageHeader
        title="Sales"
        description={shop.name}
        actions={
          <ButtonLink href="/shop/pos">
            <Plus className="size-4" /> Record sale
          </ButtonLink>
        }
      />

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
            !params.q ? <ButtonLink href="/shop/pos">Record your first sale</ButtonLink> : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface shadow-sm md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-subtle text-left">
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

          <div className="flex flex-col gap-3 md:hidden">
            {rows.map(({ sale, receipt }) => (
              <SaleCard key={sale.id} sale={sale} receipt={receipt} shopName={shop.name} />
            ))}
          </div>
        </>
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
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 hover:bg-surface-subtle">
            <span className="font-mono text-xs font-medium text-muted">
              #{sale.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-xs text-muted transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="bg-surface-subtle px-4 py-3">
            <ul className="space-y-1">
              {receipt.items.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground">
                    {line.quantity} × {line.itemName}
                  </span>
                  <span className="tabular-nums text-muted">
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
                  className="text-sm font-medium text-foreground hover:text-brand"
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
          <span className="text-sm text-muted">Walk-in customer</span>
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
        <span className="font-mono text-xs text-muted">{sale.vehicleReg}</span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="text-xs text-muted">{formatDateTime(sale.createdAt)}</td>
      <td className="text-right">
        <span className="text-sm font-semibold tabular-nums text-foreground">
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

function SaleCard({
  sale,
  receipt,
  shopName,
}: {
  sale: { attendantName: string | null } & (typeof receipt)["sale"];
  receipt: SaleReceipt;
  shopName: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <span className="font-mono text-xs font-medium text-muted">
          #{sale.id.slice(0, 8).toUpperCase()}
        </span>
        <span className="text-xs text-muted">{formatDateTime(sale.createdAt)}</span>
      </div>
      <div className="flex items-start justify-between gap-3 px-4 pt-2">
        <div className="min-w-0">
          {sale.customerName ? (
            <>
              <CustomerHistoryModal
                customerName={sale.customerName}
                trigger={
                  <button type="button" className="text-sm font-medium text-foreground hover:text-brand">
                    {sale.customerName}
                  </button>
                }
              />
              {sale.customerContact && (
                <span className="block text-xs text-muted">{sale.customerContact}</span>
              )}
            </>
          ) : (
            <span className="text-sm text-muted">Walk-in customer</span>
          )}
          {sale.vehicleReg && (
            <span className="mt-0.5 block font-mono text-xs text-muted">
              {sale.vehicleReg}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="neutral">{paymentLabels[sale.paymentMethod] ?? sale.paymentMethod}</Badge>
          {sale.status === "refunded" ? (
            <Badge variant="danger">Refunded</Badge>
          ) : (
            <Badge variant="success">Complete</Badge>
          )}
        </div>
      </div>
      <details className="group px-4 pt-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-brand">
          <span>{receipt.items.length} item{receipt.items.length === 1 ? "" : "s"}</span>
          <span className="text-muted transition-transform group-open:rotate-180">▾</span>
        </summary>
        <ul className="mt-2 space-y-1 border-t border-border pt-2">
          {receipt.items.map((line) => (
            <li key={line.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {line.quantity} × {line.itemName}
              </span>
              <span className="tabular-nums text-muted">
                {formatMoney(line.unitPriceCents * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          {sale.attendantName ? `Processed by ${sale.attendantName}` : "Attendant unavailable"}
        </p>
      </details>
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatMoney(sale.totalCents)}
        </span>
        <SaleRowActions
          saleId={sale.id}
          status={sale.status}
          receipt={receipt}
          shopName={shopName}
        />
      </div>
    </div>
  );
}
