import { requireAdmin } from "@/lib/dal";
import { getActivityPage, getActivityOptions } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { actionLabel, actionTone } from "@/lib/labels";
import { ActivityFilter } from "@/components/activity/activity-filter";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; actor?: string; action?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;

  const [logData, options] = await Promise.all([
    getActivityPage({
      shopId: params.shop,
      actorId: params.actor,
      action: params.action,
      page,
      pageSize,
    }),
    getActivityOptions(),
  ]);

  const log = logData.rows;
  const shopName = new Map(options.shops.map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity log</h1>
        <p className="text-sm text-muted">
          Chronological audit trail of actions across all shops and accounts.
        </p>
      </div>

      <ActivityFilter shops={options.shops} actors={options.users} actions={options.actions} />

      {log.length === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No activity"
          description="Actions like sign-ins, item changes, stock movements, and sales will show up here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>{logData.total} event(s) total</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100">
              {log.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex items-center gap-3 sm:w-28 sm:shrink-0">
                    <Badge variant={actionTone(entry.action)}>{actionLabel(entry.action)}</Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-900">
                      <span className="font-medium">{entry.actorName}</span>
                      {entry.shopId && shopName.has(entry.shopId) && (
                        <span className="text-muted"> · {shopName.get(entry.shopId)}</span>
                      )}
                    </p>
                    {entry.metadata ? (
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {formatMetadata(entry.action, entry.metadata)}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted sm:shrink-0">{formatDateTime(entry.createdAt)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Pagination base="/admin/activity" page={page} totalPages={logData.totalPages} total={logData.total} pageSize={pageSize} />
    </div>
  );
}

function formatMetadata(action: string, metadata: unknown): string {
  const m = (metadata ?? {}) as Record<string, unknown>;
  if (action === "item.create" || action === "item.update" || action === "item.delete") {
    return `Item: ${String(m.name ?? "")}`;
  }
  if (action === "stock.in" || action === "stock.out") {
    return `${String(m.name ?? "")} · ${String(m.quantity ?? "")} × ${String(m.reason ?? "")}`;
  }
  if (action === "stock.transfer" || action === "stock.distribute") {
    return `${String(m.name ?? "")} · ${String(m.quantity ?? "")} · ${String(m.fromShop ?? "")} → ${String(m.toShop ?? "")}`;
  }
  if (action === "sale.create") {
    const total = Number(m.totalCents ?? 0) / 100;
    return `${String(m.itemCount ?? "")} item(s) · ${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: process.env.NEXT_PUBLIC_APP_CURRENCY ?? "USD",
    }).format(total)}`;
  }
  if (action === "shop.create" || action === "shop.delete") {
    return `Shop: ${String(m.name ?? "")}`;
  }
  return JSON.stringify(m);
}
