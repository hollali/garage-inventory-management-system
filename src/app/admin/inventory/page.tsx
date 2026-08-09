import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import {
  getAdminInventoryPage,
  getAdminItemCategories,
  getShopsForDistribution,
  getDistributableItems,
} from "@/lib/queries";
import { formatMoney } from "@/lib/utils";
import { deleteAdminItem } from "@/lib/actions/admin";
import { AdminInventoryFilter } from "@/components/inventory/admin-inventory-filter";
import { AdminItemModal } from "@/components/inventory/admin-item-modal";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";
import { ImportCsvModal } from "@/components/inventory/import-csv-modal";
import { TransferModal } from "@/components/inventory/transfer-modal";
import { AdjustStockModal } from "@/components/inventory/adjust-stock-modal";
import { Pagination } from "@/components/ui/pagination";
import { SortableTh } from "@/components/ui/sortable-th";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, LowStockBadge } from "@/components/ui/badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import {
  FiDownload,
  FiEdit3,
  FiPlus,
  FiRefreshCw,
  FiShuffle,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    shopId?: string;
    type?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  const [data, categories, shops, items] = await Promise.all([
    getAdminInventoryPage({
      page,
      pageSize,
      q: params.q,
      category: params.category,
      shopId: params.shopId,
      type: params.type,
      sort: params.sort,
      dir: params.dir,
    }),
    getAdminItemCategories(),
    getShopsForDistribution(),
    getDistributableItems(),
  ]);

  const { rows, total, totalPages } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory</h1>
          <p className="text-sm text-muted">
            Central pool + stock across {shops.length} shop{shops.length === 1 ? "" : "s"} ·{" "}
            {total} item{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <BarcodeScanner basePath="/admin/inventory" />
          <ButtonLink href="/api/export/items" variant="outline">
            <FiDownload className="size-4" /> Export CSV
          </ButtonLink>
          <ImportCsvModal
            shops={shops}
            trigger={
              <Button variant="outline">
                <FiUpload className="size-4" /> Import CSV
              </Button>
            }
          />
          <AdminItemModal shops={shops} categories={categories} trigger={<Button><FiPlus className="size-4" /> Add item</Button>} />
        </div>
      </div>

      <AdminInventoryFilter categories={categories} shopList={shops} />

      {total === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No inventory found"
          description="Create items in the central pool, then distribute them to shops."
          action={
            <AdminItemModal
              shops={shops}
              categories={categories}
              trigger={<Button><FiPlus className="size-4" /> Add item</Button>}
            />
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <SortableTh base="/admin/inventory" params={params} column="name" label="Item" />
                  <TH>Shop</TH>
                  <SortableTh base="/admin/inventory" params={params} column="category" label="Category" />
                  <SortableTh base="/admin/inventory" params={params} column="price" label="Price" align="right" />
                  <SortableTh base="/admin/inventory" params={params} column="quantity" label="Qty" align="right" />
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((item) => (
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
                          <span className="font-medium text-slate-900">{item.name}</span>
                          {item.sku && <span className="ml-2 text-xs text-muted">{item.sku}</span>}
                          {item.barcode && (
                            <span className="ml-2 text-xs text-muted">Barcode: {item.barcode}</span>
                          )}
                        </div>
                      </div>
                    </TD>
                    <TD>
                      {item.shopName && item.shopId ? (
                        <Link
                          href={`/admin/shops/${item.shopId}`}
                          className="text-brand hover:underline"
                        >
                          {item.shopName}
                        </Link>
                      ) : (
                        <Badge variant="info">Central</Badge>
                      )}
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
                        <TransferModal
                          items={items}
                          shops={shops}
                          sourceShopId={item.shopId}
                          itemId={item.id}
                          trigger={
                            <IconButton label="Move stock">
                              <FiShuffle className="size-4" />
                            </IconButton>
                          }
                        />
                        <AdminItemModal
                          shops={shops}
                          categories={categories}
                          item={item}
                          trigger={
                            <IconButton label="Edit">
                              <FiEdit3 className="size-4" />
                            </IconButton>
                          }
                        />
                        <AdjustStockModal
                          item={item}
                          trigger={
                            <IconButton label="Adjust stock">
                              <FiRefreshCw className="size-4" />
                            </IconButton>
                          }
                        />
                        <ConfirmAction
                          action={deleteAdminItem}
                          hiddenFields={{ itemId: item.id }}
                          confirmTitle="Delete this item?"
                          confirmBody={`"${item.name}" and its stock history will be removed. Past sales keep a snapshot.`}
                          buttonProps={{ className: "text-red-600 hover:text-red-700" }}
                        >
                          <IconButton label="Delete" className="text-red-600 hover:text-red-700">
                            <FiTrash2 className="size-4" />
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

      <Pagination base="/admin/inventory" page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
    </div>
  );
}
