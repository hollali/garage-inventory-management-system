import Link from "next/link";
import { requireAttendantShop, getSession } from "@/lib/dal";
import { getItemCategories, getShopInventoryPage } from "@/lib/queries";
import { formatMoney } from "@/lib/utils";
import { deleteItem } from "@/lib/actions/attendant";
import { InventoryFilter } from "@/components/inventory/inventory-filter";
import { ItemModal } from "@/components/inventory/item-modal";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";
import { Pagination } from "@/components/ui/pagination";
import { SortableTh } from "@/components/ui/sortable-th";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, LowStockBadge } from "@/components/ui/badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";

export default async function ShopInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; dir?: string; page?: string }>;
}) {
  const shop = await requireAttendantShop();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  const [data, categories, session] = await Promise.all([
    getShopInventoryPage(shop.id, {
      page,
      pageSize,
      q: params.q,
      category: params.category,
      sort: params.sort,
      dir: params.dir,
    }),
    getItemCategories(shop.id),
    getSession(),
  ]);

  const { rows: items, total, totalPages } = data;
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Inventory</h1>
          <p className="text-sm text-muted">
            {total} item{total === 1 ? "" : "s"} in {shop.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isAdmin && (
            <ButtonLink href="/api/export/items" variant="outline">
              <Download className="size-4" /> Export CSV
            </ButtonLink>
          )}
          <BarcodeScanner basePath="/shop/items" />
          <ItemModal
            categories={categories}
            trigger={
              <Button>
                <Plus className="size-4" /> Add item
              </Button>
            }
          />
        </div>
      </div>

      <InventoryFilter categories={categories} />

      {total === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No items found"
          description={
            params.q || (params.category && params.category !== "All")
              ? "Try adjusting your search or filters."
              : "Add your first tool or equipment item to get started."
          }
          action={
            !params.q && !(params.category && params.category !== "All") ? (
              <ItemModal
                categories={categories}
                trigger={
                  <Button>
                    <Plus className="size-4" /> Add item
                  </Button>
                }
              />
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <SortableTh base="/shop/items" params={params} column="name" label="Item" />
                  <SortableTh base="/shop/items" params={params} column="category" label="Category" />
                  <SortableTh base="/shop/items" params={params} column="price" label="Price" align="right" />
                  <SortableTh base="/shop/items" params={params} column="quantity" label="Qty" align="right" />
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((item) => (
                  <TR key={item.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        {item.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 shrink-0 rounded object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/shop/items/${item.id}`}
                            className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-brand"
                          >
                            {item.name}
                          </Link>
                          {item.sku && <span className="ml-2 text-xs text-muted">{item.sku}</span>}
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge variant="neutral">{item.category}</Badge>
                    </TD>
                    <TD className="text-right tabular-nums">{formatMoney(item.unitPriceCents)}</TD>
                    <TD className="text-right tabular-nums font-medium">
                      {item.quantity}
                      {item.unitName && item.unitName !== "piece" && (
                        <span className="ml-1 text-xs font-normal text-muted">{item.unitName}</span>
                      )}
                    </TD>
                    <TD>
                      <LowStockBadge quantity={item.quantity} threshold={item.lowStockThreshold} />
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ItemModal
                          categories={categories}
                          item={item}
                          trigger={
                            <IconButton label="Edit">
                              <Pencil className="size-4" />
                            </IconButton>
                          }
                        />
                        <ConfirmAction
                          action={deleteItem}
                          hiddenFields={{ id: item.id }}
                          confirmTitle="Delete this item?"
                          confirmBody={`"${item.name}" and its stock history will be removed. Past sales keep a snapshot.`}
                          buttonProps={{ className: "text-red-600 hover:text-red-700" }}
                        >
                          <IconButton label="Delete" className="text-red-600 hover:text-red-700">
                            <Trash2 className="size-4" />
                          </IconButton>
                        </ConfirmAction>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination base="/shop/items" page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
    </div>
  );
}
