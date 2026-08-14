"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { receivePurchaseOrder } from "@/lib/actions/purchasing";
import { formatMoney } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/forms";

export type ReceiveLine = {
  id: string;
  itemName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCostCents: number;
};

export function ReceivePoModal({
  poId,
  poNumber,
  lines,
  trigger,
}: {
  poId: string;
  poNumber: string;
  lines: ReceiveLine[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => receivePurchaseOrder(formData),
    undefined,
  );
  const actionState = state as { ok?: boolean; error?: string } | undefined;

  const prevOk = useRef(false);
  useEffect(() => {
    if (open && actionState?.ok && !prevOk.current) {
      prevOk.current = true;
      setOpen(false);
      router.refresh();
    }
    if (!actionState?.ok) prevOk.current = false;
  }, [open, actionState, router]);

  const totalCents = lines.reduce(
    (sum, line) => sum + line.unitCostCents * line.quantityOrdered,
    0,
  );

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title={`Receive ${poNumber}`} size="lg">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="poId" value={poId} />
          {actionState?.error && <FormError>{actionState.error}</FormError>}

          {lines.length === 0 ? (
            <p className="text-sm text-muted">This order has no line items.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Ordered</th>
                    <th className="px-3 py-2 text-right">Unit cost</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{line.itemName}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{line.quantityOrdered}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(line.unitCostCents)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatMoney(line.unitCostCents * line.quantityOrdered)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-zinc-50 dark:bg-zinc-800/40">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatMoney(totalCents)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <p className="text-sm text-muted">
            Receiving adds the ordered quantities to the {poNumber} stock and updates item costs.
          </p>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Confirm receive
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
