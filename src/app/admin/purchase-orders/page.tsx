import { requireAdmin } from "@/lib/dal";
import {
  getItemsForPo,
  getPurchaseOrderItemsByIds,
  getPurchaseOrders,
  getSuppliers,
} from "@/lib/queries/purchasing";
import { getAllShops } from "@/lib/queries";
import { cancelPurchaseOrder } from "@/lib/actions/purchasing";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { PoModal } from "@/components/purchasing/po-modal";
import { ReceivePoModal } from "@/components/purchasing/receive-po-modal";
import { Pagination } from "@/components/ui/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { CheckCircle2, Plus, XCircle } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  if (status === "received") return <Badge variant="success">Received</Badge>;
  if (status === "cancelled") return <Badge variant="danger">Cancelled</Badge>;
  return <Badge variant="neutral">Draft</Badge>;
}

export default async function AdminPurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  const [data, shops, suppliers, centralItems] = await Promise.all([
    getPurchaseOrders({ page, pageSize, status: params.status }),
    getAllShops(),
    getSuppliers(),
    getItemsForPo(null),
  ]);

  const shopItems = await Promise.all(shops.map((s) => getItemsForPo(s.id)));
  const items = [...centralItems, ...shopItems.flat()];

  const { rows, total, totalPages } = data;

  const draftIds = rows.filter((r) => r.status === "draft").map((r) => r.id);
  const poLineRows = await getPurchaseOrderItemsByIds(draftIds);
  const linesByPo = new Map<string, (typeof poLineRows)[number][]>();
  for (const line of poLineRows) {
    const group = linesByPo.get(line.purchaseOrderId) ?? [];
    group.push(line);
    linesByPo.set(line.purchaseOrderId, group);
  }

  const poNumber = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Purchase orders</h1>
          <p className="text-sm text-muted">
            {total} order{total === 1 ? "" : "s"} · {suppliers.length} supplier
            {suppliers.length === 1 ? "" : "s"}
          </p>
        </div>
        <PoModal
          shops={shops}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          items={items}
          urlAction="new"
          trigger={
            <Button>
              <Plus className="size-4" /> New purchase order
            </Button>
          }
        />
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No purchase orders yet"
          description="Create a purchase order to restock your central pool or a shop."
          action={
            <PoModal
              shops={shops}
              suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
              items={items}
              trigger={
                <Button>
                  <Plus className="size-4" /> Create order
                </Button>
              }
            />
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Supplier</TH>
                  <TH>Shop</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((po) => (
                  <TR key={po.id}>
                    <TD>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{poNumber(po.id)}</span>
                      {po.createdByName && (
                        <span className="block text-xs text-muted">by {po.createdByName}</span>
                      )}
                    </TD>
                    <TD>
                      {po.supplierName || <span className="text-muted">—</span>}
                    </TD>
                    <TD>
                      {po.shopId && po.shopName ? (
                        <span className="text-zinc-900 dark:text-zinc-100">{po.shopName}</span>
                      ) : (
                        <Badge variant="info">Central</Badge>
                      )}
                    </TD>
                    <TD>
                      <StatusBadge status={po.status} />
                    </TD>
                    <TD className="text-right tabular-nums font-medium">
                      {formatMoney(po.totalCents)}
                    </TD>
                    <TD className="text-muted">{formatDateTime(po.createdAt)}</TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {po.status === "draft" && (
                          <>
                            <ReceivePoModal
                              poId={po.id}
                              poNumber={poNumber(po.id)}
                              lines={linesByPo.get(po.id) ?? []}
                              trigger={
                                <Button size="sm" variant="secondary">
                                  <CheckCircle2 className="size-4" /> Receive
                                </Button>
                              }
                            />
                            <ConfirmAction
                              action={cancelPurchaseOrder}
                              hiddenFields={{ poId: po.id }}
                              confirmTitle="Cancel this purchase order?"
                              confirmBody="The order will be marked as cancelled and can no longer be received."
                              successMessage="Purchase order cancelled"
                            >
                              <IconButton label="Cancel order" variant="danger">
                                <XCircle className="size-4" />
                              </IconButton>
                            </ConfirmAction>
                          </>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination
        base="/admin/purchase-orders"
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
      />
    </div>
  );
}
