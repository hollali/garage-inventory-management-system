import { requireAttendantShop } from "@/lib/dal";
import { getShopInventory } from "@/lib/queries";
import { getShopsForTransfers, getTransferRequests } from "@/lib/queries/transfers";
import { formatDateTime } from "@/lib/utils";
import { cancelTransfer } from "@/lib/actions/transfers";
import { RequestTransferModal } from "@/components/transfers/request-transfer-modal";
import { TransferStatusBadge } from "@/components/transfers/transfer-status-badge";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { FiPlus } from "react-icons/fi";

export default async function ShopTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const shop = await requireAttendantShop();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  const [inventory, shops, data] = await Promise.all([
    getShopInventory(shop.id),
    getShopsForTransfers(),
    getTransferRequests({ shopId: shop.id, page, pageSize }),
  ]);

  const items = inventory.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity }));
  const otherShops = shops.filter((s) => s.id !== shop.id);
  const { rows, total, totalPages } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transfers</h1>
          <p className="text-sm text-muted">
            Request stock from {shop.name} to another shop or the central pool. An admin approves
            each request before stock moves.
          </p>
        </div>
        <RequestTransferModal
          items={items}
          otherShops={otherShops}
          trigger={
            <Button disabled={items.length === 0}>
              <FiPlus className="size-4" /> Request stock
            </Button>
          }
        />
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No transfer requests yet"
          description="Request stock be moved from your shop to another shop or the central pool for admin approval."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Item</TH>
                  <TH className="text-right">Qty</TH>
                  <TH>To</TH>
                  <TH>Note</TH>
                  <TH>Requested</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((request) => (
                  <TR key={request.id}>
                    <TD className="font-medium text-slate-900">{request.itemName}</TD>
                    <TD className="text-right tabular-nums">{request.quantity}</TD>
                    <TD>
                      {request.toShopName ? (
                        request.toShopName
                      ) : (
                        <Badge variant="info">Central</Badge>
                      )}
                    </TD>
                    <TD className="max-w-48">
                      {request.note ? (
                        <span className="block truncate text-xs text-muted" title={request.note}>
                          {request.note}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </TD>
                    <TD className="text-xs text-muted">{formatDateTime(request.createdAt)}</TD>
                    <TD>
                      <TransferStatusBadge status={request.status} />
                    </TD>
                    <TD className="text-right">
                      {request.status === "pending" && (
                        <form action={cancelTransfer as (formData: FormData) => void}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Cancel
                          </Button>
                        </form>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination base="/shop/transfers" page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
    </div>
  );
}
