"use client";

import { useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { getCustomerHistoryAction } from "@/lib/actions/sales";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { CustomerHistoryRow } from "@/lib/queries/sales";

export function CustomerHistoryModal({
  customerName,
  trigger,
}: {
  customerName: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<CustomerHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openModal(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
    if (history) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("customerName", customerName);
      const result = await getCustomerHistoryAction(formData);
      if (result && "error" in result) {
        setError(result.error);
      } else if (result) {
        setHistory(result.history);
      }
    });
  }

  return (
    <>
      <span onClick={openModal} className="inline-flex">
        {trigger}
      </span>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Customer history"
        description={customerName}
        size="lg"
      >
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : !history ? (
          <div className="py-6 text-center text-sm text-muted">
            {pending ? "Loading…" : "No history loaded."}
          </div>
        ) : history.length === 0 ? (
          <EmptyState title="No past sales" description={`No prior purchases found for ${customerName}.`} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((sale) => (
              <li key={sale.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-slate-500">
                      #{sale.id.slice(0, 8).toUpperCase()}
                    </span>
                    {sale.status === "refunded" ? (
                      <Badge variant="danger">Refunded</Badge>
                    ) : (
                      <Badge variant="success">Complete</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(sale.createdAt)} · {sale.itemCount} item
                    {sale.itemCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatMoney(sale.totalCents)}
                  </p>
                  {sale.vehicleReg && (
                    <p className="font-mono text-xs text-muted">{sale.vehicleReg}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
