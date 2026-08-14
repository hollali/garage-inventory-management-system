import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { getAttendantList, getShopsWithSummary } from "@/lib/queries";
import { formatMoney } from "@/lib/utils";
import { ShopModal, type ShopAttendantOption } from "@/components/shops/shop-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Plus } from "lucide-react";

export default async function AdminShopsPage() {
  await requireAdmin();
  const [shops, attendants] = await Promise.all([getShopsWithSummary(), getAttendantList()]);

  const options: ShopAttendantOption[] = attendants
    .filter(({ user }) => user.active)
    .map(({ user, shop }) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      assignedShopName: shop?.name ?? null,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Shops</h1>
          <p className="text-sm text-muted">
            {shops.length} shop{shops.length === 1 ? "" : "s"} · one attendant per shop.
          </p>
        </div>
        <ShopModal
          attendants={options}
          trigger={
            <Button>
              <Plus className="size-4" /> New shop
            </Button>
          }
        />
      </div>

      {shops.length === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No shops yet"
          description="Create your first shop and assign an attendant."
          action={
            <ShopModal
              attendants={options}
              trigger={
                <Button>
                  <Plus className="size-4" /> Create shop
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shops.map(
            ({ shop, attendantName, itemCount, lowStockCount, inventoryValueCents, revenueCents }) => (
              <Link key={shop.id} href={`/admin/shops/${shop.id}`} className="group">
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="group-hover:text-brand">{shop.name}</CardTitle>
                      {lowStockCount > 0 ? (
                        <Badge variant="warning">{lowStockCount} low</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted">{shop.location}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <p className="text-muted">
                          Attendant:{" "}
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {attendantName ?? "Unassigned"}
                          </span>
                        </p>
                        <p className="text-muted">
                          Items: <span className="font-medium text-zinc-900 dark:text-zinc-100">{itemCount}</span>
                        </p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-muted">
                          Value:{" "}
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {formatMoney(inventoryValueCents)}
                          </span>
                        </p>
                        <p className="text-muted">
                          Revenue:{" "}
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {formatMoney(revenueCents)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
