import { requireAdmin } from "@/lib/dal";
import { getActivityPage, getActivityOptions, type ActivityType } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { actionLabel, actionTone } from "@/lib/labels";
import { ActivityFilter } from "@/components/activity/activity-filter";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; actor?: string; action?: string; page?: string; type?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 20;
  const type: ActivityType =
    params.type === "auth"
      ? "auth"
      : params.type === "all"
        ? "all"
        : "shop";

  const [logData, options] = await Promise.all([
    getActivityPage({
      shopId: params.shop,
      actorId: params.actor,
      action: params.action,
      type,
      page,
      pageSize,
    }),
    getActivityOptions(type),
  ]);

  const log = logData.rows;
  const shopName = new Map(options.shops.map((s) => [s.id, s.name]));
  const hasFilters = Boolean(params.shop || params.actor || params.action);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Activity log"
        description={
          type === "auth"
            ? "Sign-ins, password resets, and two-factor authentication events across all accounts."
            : type === "all"
              ? "Every logged event, including sign-ins and security actions."
              : "Chronological audit trail of operational actions across all shops and accounts."
        }
        actions={<ActivityTypeTabs type={type} />}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filter activity</CardTitle>
          <CardDescription>Narrow events by shop, person, or action.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ActivityFilter shops={options.shops} actors={options.users} actions={options.actions} />
        </CardContent>
      </Card>

      {log.length === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title={hasFilters ? "No matching activity" : "No activity"}
          description={
            hasFilters
              ? "No events match the current filters. Try widening your search."
              : "Actions like sign-ins, item changes, stock movements, and sales will show up here."
          }
          action={
            hasFilters ? (
              <Link
                href={`/admin/activity${type !== "shop" ? `?type=${type}` : ""}`}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-subtle"
              >
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>
              {logData.total} {logData.total === 1 ? "event" : "events"} total
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/70">
              {log.map((entry) => (
                <li
                  key={entry.id}
                  className="grid min-w-0 grid-cols-1 gap-2.5 px-4 py-4 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5"
                >
                  <div className="flex min-w-0 items-start">
                    <Badge variant={actionTone(entry.action)} className="max-w-full whitespace-normal break-words">
                      {actionLabel(entry.action)}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm text-foreground">
                      <span className="font-medium">{entry.actorName}</span>
                      {entry.shopId && shopName.has(entry.shopId) && (
                        <span className="text-muted"> · {shopName.get(entry.shopId)}</span>
                      )}
                    </p>
                    {entry.metadata ? <MetadataText action={entry.action} metadata={entry.metadata} /> : null}
                  </div>
                  <time
                    dateTime={new Date(entry.createdAt).toISOString()}
                    className="text-xs text-muted sm:shrink-0 sm:text-right"
                  >
                    {formatDateTime(entry.createdAt)}
                  </time>
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

function MetadataText({ action, metadata }: { action: string; metadata: unknown }) {
  const plain = formatMetadata(action, metadata);
  const node = formatMetadataNode(action, metadata);
  if (!node) return null;
  return (
    <p className="mt-1 break-words text-xs leading-5 text-muted" title={plain ?? undefined}>
      {node}
    </p>
  );
}

function formatMetadataNode(action: string, metadata: unknown): ReactNode | null {
  const m = (metadata ?? {}) as Record<string, unknown>;
  if (action === "stock.transfer" || action === "stock.distribute") {
    return (
      <span className="inline-flex max-w-full flex-wrap items-center gap-1 break-words">
        {String(m.name ?? "")} · {String(m.quantity ?? "")} · {String(m.fromShop ?? "")}
        <ArrowRight className="size-3 shrink-0" aria-hidden />
        {String(m.toShop ?? "")}
      </span>
    );
  }
  return formatMetadata(action, metadata);
}

function formatMetadata(action: string, metadata: unknown): string | null {
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
  if (action === "shop.switch") {
    return `Switched to: ${String(m.name ?? "")}`;
  }
  return null;
}

function ActivityTypeTabs({ type }: { type: ActivityType }) {
  const tabs: { value: ActivityType; label: string; href: string }[] = [
    { value: "shop", label: "Shop activity", href: "/admin/activity" },
    { value: "auth", label: "Sign-ins & security", href: "/admin/activity?type=auth" },
    { value: "all", label: "All events", href: "/admin/activity?type=all" },
  ];
  return (
    <nav
      aria-label="Activity type"
      className="inline-flex max-w-full overflow-x-auto rounded-xl border border-border bg-surface-subtle p-1 shadow-sm"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          aria-current={type === tab.value ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-3 sm:text-sm",
            type === tab.value
              ? "bg-brand text-brand-foreground shadow-sm"
              : "text-muted hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
