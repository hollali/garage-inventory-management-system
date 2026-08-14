import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { getTransferRequests, type TransferRequestStatus } from "@/lib/queries/transfers";
import { formatDateTime } from "@/lib/utils";
import { approveTransfer, rejectTransfer } from "@/lib/actions/transfers";
import { TransferStatusBadge } from "@/components/transfers/transfer-status-badge";
import { ConfirmAction } from "@/components/confirm-action";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, BoxIcon } from "@/components/ui/empty-state";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { Check, X } from "lucide-react";

const VALID_STATUSES: TransferRequestStatus[] = [
  "pending",
  "approved",
  "rejected",
  "completed",
];

const filters: { value: TransferRequestStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

export default async function AdminTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  const status = VALID_STATUSES.includes(params.status as TransferRequestStatus)
    ? (params.status as TransferRequestStatus)
    : undefined;

  const data = await getTransferRequests({ status, page, pageSize });
  const { rows, total, totalPages } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Transfer requests</h1>
        <p className="text-sm text-muted">
          Attendants request stock moved from their shop to another shop or the central pool.
          Approving a request executes the stock movement immediately.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => {
          const active = (f.value || undefined) === status;
          const href = f.value ? `/admin/transfers?status=${f.value}` : "/admin/transfers";
          return (
            <Link
              key={f.value || "all"}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white shadow-sm"
                  : "rounded-lg border border-zinc-300 dark:border-zinc-700 bg-surface px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<BoxIcon className="size-6" />}
          title="No transfer requests"
          description={
            status
              ? `No ${status} transfer requests found.`
              : "Attendants can request stock transfers from their shop. Requests will appear here for approval."
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>From</TH>
                  <TH>Item</TH>
                  <TH className="text-right">Qty</TH>
                  <TH>To</TH>
                  <TH>Requested by</TH>
                  <TH>Date</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((request) => (
                  <TR key={request.id}>
                    <TD className="font-medium text-zinc-900 dark:text-zinc-100">{request.fromShopName}</TD>
                    <TD>
                      {request.itemName}
                      {request.note && (
                        <span
                          className="ml-2 block max-w-40 truncate text-xs text-muted sm:inline"
                          title={request.note}
                        >
                          {request.note}
                        </span>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">{request.quantity}</TD>
                    <TD>
                      {request.toShopName ? (
                        request.toShopName
                      ) : (
                        <Badge variant="info">Central</Badge>
                      )}
                    </TD>
                    <TD className="text-sm text-muted">
                      {request.requesterName ?? "Unknown"}
                    </TD>
                    <TD className="text-xs text-muted">{formatDateTime(request.createdAt)}</TD>
                    <TD>
                      <TransferStatusBadge status={request.status} />
                    </TD>
                    <TD className="text-right">
                      {request.status === "pending" && (
                        <div className="flex items-center justify-end gap-1">
                          <ConfirmAction
                            action={approveTransfer}
                            hiddenFields={{ requestId: request.id }}
                            confirmTitle="Approve transfer?"
                            confirmBody="Approving immediately moves this stock. This cannot be undone."
                          >
                            <Check className="size-4" /> Approve
                          </ConfirmAction>
                          <ConfirmAction
                            action={rejectTransfer}
                            hiddenFields={{ requestId: request.id }}
                            confirmTitle="Reject transfer?"
                            buttonProps={{ variant: "outline" }}
                          >
                            <X className="size-4" /> Reject
                          </ConfirmAction>
                        </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination base="/admin/transfers" page={page} totalPages={totalPages} total={total} pageSize={pageSize} />
    </div>
  );
}
