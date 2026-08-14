import { requireAdmin } from "@/lib/dal";
import { getWorkOrderDetail, getWorkOrders } from "@/lib/queries/work-orders";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { WorkOrdersFilter } from "@/components/work-orders/work-orders-filter";
import { WorkOrderDetailModal } from "@/components/work-orders/work-order-detail-modal";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Eye } from "lucide-react";

export default async function AdminWorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  const data = await getWorkOrders(undefined, { page, pageSize, status: params.status });

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
          <p className="text-sm text-muted">Job cards across all shops</p>
        </div>
        <WorkOrdersFilter />
      </div>

      {data.total === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No work orders found"
          description={
            params.status && params.status !== "All"
              ? "Try a different status filter."
              : "Work orders created by attendants will appear here."
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Shop</TH>
                  <TH>Vehicle</TH>
                  <TH>Customer</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Created</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map(({ workOrder, parts }) => (
                  <TR key={workOrder.id}>
                    <TD>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {workOrder.shopName || "—"}
                      </span>
                    </TD>
                    <TD>
                      <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                        {workOrder.vehicleReg || "—"}
                      </span>
                    </TD>
                    <TD>{workOrder.customerName || "—"}</TD>
                    <TD>
                      <WorkOrderStatusBadge status={workOrder.status} />
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatMoney(workOrder.labourCents + workOrder.partsTotalCents)}
                    </TD>
                    <TD className="text-xs text-muted">{formatDateTime(workOrder.createdAt)}</TD>
                    <TD className="text-right">
                      <WorkOrderDetailModal
                        workOrder={{ ...workOrder, createdAt: formatDateTime(workOrder.createdAt) }}
                        parts={parts}
                        items={[]}
                        canEdit={false}
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
        base="/admin/work-orders"
        page={page}
        totalPages={data.totalPages}
        total={data.total}
        pageSize={pageSize}
      />
    </div>
  );
}
