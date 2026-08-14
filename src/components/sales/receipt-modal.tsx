"use client";

import { formatDateTime, formatMoney } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { SaleReceipt } from "@/lib/queries/sales";

const paymentLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mobile: "Mobile money",
  other: "Other",
};

export function ReceiptModal({
  open,
  onClose,
  shopName,
  receipt,
}: {
  open: boolean;
  onClose: () => void;
  shopName: string;
  receipt: SaleReceipt;
}) {
  const { sale, items, returns } = receipt;
  const subtotalCents = items.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);

  return (
    <Modal open={open} onClose={onClose} title="Receipt" size="md">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: absolute; left: 0; top: 0; width: 100%; }
          .print-hide { display: none !important; }
        }
      `}</style>
      <div className="print-receipt">
        <div className="border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-4 text-center">
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{shopName}</p>
          <p className="mt-1 font-mono text-xs text-muted">
            #{sale.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-xs text-muted">{formatDateTime(sale.createdAt)}</p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {sale.customerName && (
            <>
              <dt className="text-muted">Customer</dt>
              <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">{sale.customerName}</dd>
            </>
          )}
          {sale.customerContact && (
            <>
              <dt className="text-muted">Contact</dt>
              <dd className="text-right text-zinc-700 dark:text-zinc-300">{sale.customerContact}</dd>
            </>
          )}
          {sale.vehicleReg && (
            <>
              <dt className="text-muted">Vehicle</dt>
              <dd className="text-right font-mono text-zinc-700 dark:text-zinc-300">{sale.vehicleReg}</dd>
            </>
          )}
          <dt className="text-muted">Payment</dt>
          <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
            {paymentLabels[sale.paymentMethod] ?? sale.paymentMethod}
          </dd>
        </dl>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
            {items.map((line) => (
              <tr key={line.id}>
                <td className="py-1.5 text-zinc-900 dark:text-zinc-100">{line.itemName}</td>
                <td className="py-1.5 text-right tabular-nums">{line.quantity}</td>
                <td className="py-1.5 text-right tabular-nums">{formatMoney(line.unitPriceCents)}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatMoney(line.unitPriceCents * line.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 space-y-1 border-t border-dashed border-zinc-200 dark:border-zinc-800 pt-3 text-sm">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(subtotalCents)}</span>
          </div>
          {sale.discountCents > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span className="tabular-nums">−{formatMoney(sale.discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-zinc-100">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(sale.totalCents)}</span>
          </div>
        </div>

        {returns.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Refunds</p>
            <ul className="mt-1 space-y-1 text-sm">
              {returns.map((refund) => (
                <li key={refund.id} className="flex items-center justify-between gap-3">
                  <span className="text-red-700">
                    {formatDateTime(refund.createdAt)}
                    {refund.reason ? ` — ${refund.reason}` : ""}
                  </span>
                  <span className="font-medium tabular-nums text-red-700">
                    −{formatMoney(refund.refundCents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted">
          {sale.attendantName ? `Processed by ${sale.attendantName}` : "Attendant unavailable"}
        </p>
      </div>

      <div className="print-hide mt-4 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800/70 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="size-4" /> Print
        </Button>
      </div>
    </Modal>
  );
}
