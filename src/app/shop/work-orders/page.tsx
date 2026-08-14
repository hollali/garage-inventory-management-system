import { requireAttendantShop } from "@/lib/dal";
import { getItemsForWorkOrder, getWorkOrderDetail, getWorkOrders } from "@/lib/queries/work-orders";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { WorkOrderModal } from "@/components/work-orders/work-order-modal";
import { WorkOrderDetailModal } from "@/components/work-orders/work-order-detail-modal";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Eye, Plus } from "lucide-react";

export default async function ShopWorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const shop = await requireAttendantShop();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  const [data, items] = await Promise.all([
    getWorkOrders(shop.id, { page, pageSize }),
    getItemsForWorkOrder(shop.id),
  ]);

  const rows = (
    await Promise.all(
      data.rows.map(async (wo) => {
        const detail = await getWorkOrderDetail(wo.id);
        return detail ? { workOrder: detail.workOrder, parts: detail.parts } : null;
      }),
    )
  ).filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Work orders</h1>
          <p className="text-sm text-muted">{shop.name}</p>
        </div>
        <WorkOrderModal
          trigger={
            <Button>
              <Plus className="size-4" /> New work order
            </Button>
          }
        />
      </div>

      {data.total === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No work orders"
          description="Create a job card for a vehicle to track labour and parts."
          action={
            <WorkOrderModal
              trigger={
                <Button>
                  <Plus className="size-4" /> Create your first work order
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
                  <TH>Vehicle</TH>
                  <TH>Customer</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Amounts</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map(({ workOrder, parts }) => (
                  <TR key={workOrder.id}>
                    <TD>
                      <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {workOrder.vehicleReg || "—"}
                      </span>
                    </TD>
                    <TD>
                      <span className="text-zinc-900 dark:text-zinc-100">{workOrder.customerName || "—"}</span>
                      {workOrder.customerContact && (
                        <span className="ml-2 text-xs text-muted">{workOrder.customerContact}</span>
                      )}
                    </TD>
                    <TD>
                      <WorkOrderStatusBadge status={workOrder.status} />
                    </TD>
                    <TD className="text-right tabular-nums">
                      <div className="text-xs text-muted">
                        L {formatMoney(workOrder.labourCents)} · P{" "}
                        {formatMoney(workOrder.partsTotalCents)}
                      </div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatMoney(workOrder.labourCents + workOrder.partsTotalCents)}
                      </div>
                    </TD>
                    <TD className="text-xs text-muted">{formatDateTime(workOrder.createdAt)}</TD>
                    <TD className="text-right">
                      <WorkOrderDetailModal
                        workOrder={{ ...workOrder, createdAt: formatDateTime(workOrder.createdAt) }}
                        parts={parts}
                        items={items}
                        canEdit
                        trigger={
                          <Button variant="outline" size="sm">
                            <Eye className="size-4" /> View
                          </Button>
                        }
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination
        base="/shop/work-orders"
        page={page}
        totalPages={data.totalPages}
        total={data.total}
        pageSize={pageSize}
      />
    </div>
  );
}
