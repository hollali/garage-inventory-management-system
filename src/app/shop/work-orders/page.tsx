import Link from "next/link";
import { requireAttendantShop } from "@/lib/dal";
import { getWorkOrders } from "@/lib/queries/work-orders";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { WorkOrderModal } from "@/components/work-orders/work-order-modal";
import { PageHeader } from "@/components/ui/page-header";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status";
import { Pagination } from "@/components/ui/pagination";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Plus } from "lucide-react";

export default async function ShopWorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const shop = await requireAttendantShop();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  const data = await getWorkOrders(shop.id, { page, pageSize });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Work orders"
        description={shop.name}
        actions={
          <WorkOrderModal
            urlAction="new"
            trigger={
              <Button>
                <Plus className="size-4" /> New work order
              </Button>
            }
          />
        }
      />

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
        <>
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Vehicle</TH>
                      <TH className="hidden md:table-cell">Customer</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Amounts</TH>
                      <TH className="hidden md:table-cell">Created</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.rows.map((workOrder) => (
                      <TR key={workOrder.id}>
                        <TD>
                          <Link
                            href={`/shop/work-orders/${workOrder.id}`}
                            className="font-mono text-sm font-medium whitespace-nowrap text-foreground hover:underline"
                          >
                            {workOrder.vehicleReg || "—"}
                          </Link>
                        </TD>
                        <TD className="hidden md:table-cell">
                          <span className="text-foreground">{workOrder.customerName || "—"}</span>
                          {workOrder.customerContact && (
                            <span className="ml-2 text-xs text-muted">{workOrder.customerContact}</span>
                          )}
                        </TD>
                        <TD>
                          <WorkOrderStatusBadge status={workOrder.status} />
                        </TD>
                        <TD className="text-right whitespace-nowrap tabular-nums">
                          <div className="text-xs text-muted">
                            L {formatMoney(workOrder.labourCents)} · P{" "}
                            {formatMoney(workOrder.partsTotalCents)}
                          </div>
                          <div className="font-semibold text-foreground">
                            {formatMoney(workOrder.labourCents + workOrder.partsTotalCents)}
                          </div>
                        </TD>
                        <TD className="hidden text-xs whitespace-nowrap text-muted md:table-cell">
                          {formatDateTime(workOrder.createdAt)}
                        </TD>
                        <TD className="text-right">
                          <ButtonLink href={`/shop/work-orders/${workOrder.id}`} variant="outline" size="sm">
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
                      <Link
                        href={`/shop/work-orders/${workOrder.id}`}
                        className="font-mono text-sm font-medium text-foreground hover:underline"
                      >
                        {workOrder.vehicleReg || "—"}
                      </Link>
                      <div className="mt-1 text-xs text-muted">
                        {workOrder.customerName || "No customer"}
                        {workOrder.customerContact && ` · ${workOrder.customerContact}`}
                      </div>
                      <WorkOrderStatusBadge status={workOrder.status} />
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold tabular-nums text-foreground">
                        {formatMoney(workOrder.labourCents + workOrder.partsTotalCents)}
                      </div>
                      <div className="text-xs text-muted">
                        L {formatMoney(workOrder.labourCents)} · P{" "}
                        {formatMoney(workOrder.partsTotalCents)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted">{formatDateTime(workOrder.createdAt)}</span>
                    <ButtonLink href={`/shop/work-orders/${workOrder.id}`} variant="outline" size="sm">
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
        base="/shop/work-orders"
        page={page}
        totalPages={data.totalPages}
        total={data.total}
        pageSize={pageSize}
      />
    </div>
  );
}
