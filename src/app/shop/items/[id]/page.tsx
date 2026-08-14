import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAttendantShop } from "@/lib/dal";
import { getItemCategories, getItemWithMovements } from "@/lib/queries";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { adjustStock } from "@/lib/actions/attendant";
import { ItemModal } from "@/components/inventory/item-modal";
import { AdjustStockModal } from "@/components/inventory/adjust-stock-modal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, LowStockBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Pencil, Package } from "lucide-react";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const shop = await requireAttendantShop();
  const { id } = await params;
  const data = await getItemWithMovements(shop.id, id);
  if (!data) notFound();

  const { item, movements } = data;
  const categories = await getItemCategories(shop.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/shop/items" className="text-sm text-muted hover:text-brand">
          ← Back to inventory
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{item.name}</h1>
          <LowStockBadge quantity={item.quantity} threshold={item.lowStockThreshold} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {item.category}
            {item.sku ? ` · ${item.sku}` : ""} · {formatMoney(item.unitPriceCents)} / unit ·{" "}
            {item.quantity} on hand
          </p>
          <ItemModal
            categories={categories}
            item={item}
            trigger={
              <Button variant="outline">
                <Pencil className="size-4" /> Edit item
              </Button>
            }
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Adjust stock</CardTitle>
            <CardDescription>
              Record stock in (restock, transfer) or stock out (damage, transfer).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdjustStockModal
              item={item}
              action={adjustStock}
              trigger={
                <Button>
                  <Package className="size-4" /> Record movement
                </Button>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock history</CardTitle>
            <CardDescription>{movements.length} movement(s) recorded</CardDescription>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <EmptyState icon={<BoxIcon className="size-6" />} title="No movements yet" />
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                {movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={m.type === "in" ? "success" : "danger"}>
                          {m.type === "in" ? "In" : "Out"}
                        </Badge>
                        <span className="text-xs capitalize text-zinc-600 dark:text-zinc-400">{m.reason}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{formatDateTime(m.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          m.type === "in" ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {m.type === "in" ? "+" : "−"}
                        {m.quantity}
                      </p>
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
