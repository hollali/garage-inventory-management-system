import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { getWorkOrders } from "@/lib/queries/work-orders";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { WorkOrdersFilter } from "@/components/work-orders/work-orders-filter";
import { PageHeader } from "@/components/ui/page-header";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status";
import { Pagination } from "@/components/ui/pagination";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Work orders"
        description="Job cards across all shops"
        actions={<WorkOrdersFilter />}
      />

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
        <>
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Shop</TH>
                      <TH>Vehicle</TH>
                      <TH className="hidden md:table-cell">Customer</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Total</TH>
                      <TH className="hidden md:table-cell">Created</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.rows.map((workOrder) => (
                      <TR key={workOrder.id}>
                        <TD>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {workOrder.shopName || "—"}
                          </span>
                        </TD>
                        <TD>
                          <Link
                            href={`/admin/work-orders/${workOrder.id}`}
                            className="font-mono text-sm whitespace-nowrap text-zinc-900 hover:underline dark:text-zinc-100"
                          >
                            {workOrder.vehicleReg || "—"}
                          </Link>
                        </TD>
                        <TD className="hidden md:table-cell">{workOrder.customerName || "—"}</TD>
                        <TD>
                          <WorkOrderStatusBadge status={workOrder.status} />
                        </TD>
                        <TD className="text-right font-semibold whitespace-nowrap tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatMoney(workOrder.labourCents + workOrder.partsTotalCents)}
                        </TD>
                        <TD className="hidden text-xs whitespace-nowrap text-muted md:table-cell">
                          {formatDateTime(workOrder.createdAt)}
                        </TD>
                        <TD className="text-right">
                          <ButtonLink href={`/admin/work-orders/${workOrder.id}`} variant="outline" size="sm">
                            View
                          </ButtonLink>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {data.rows.map((workOrder) => (
              <Card key={workOrder.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted">{workOrder.shopName || "—"}</p>
                      <Link
                        href={`/admin/work-orders/${workOrder.id}`}
                        className="mt-0.5 block font-mono text-sm font-medium text-foreground hover:underline"
                      >
                        {workOrder.vehicleReg || "—"}
                      </Link>
                      <div className="mt-1 text-xs text-muted">{workOrder.customerName || "No customer"}</div>
                      <WorkOrderStatusBadge status={workOrder.status} />
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold tabular-nums text-foreground">
                        {formatMoney(workOrder.labourCents + workOrder.partsTotalCents)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted">{formatDateTime(workOrder.createdAt)}</span>
                    <ButtonLink href={`/admin/work-orders/${workOrder.id}`} variant="outline" size="sm">
                      View
                    </ButtonLink>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
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
