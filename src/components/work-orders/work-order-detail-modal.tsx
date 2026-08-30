"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  addWorkOrderPart,
  setWorkOrderStatus,
  updateWorkOrder,
} from "@/lib/actions/work-orders";
import { formatMoney } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FormError } from "@/components/ui/forms";
import { useToast } from "@/components/ui/toast";
import { WorkOrderStatusBadge, type WorkOrderStatus } from "./work-order-status";
import { CheckCircle2, Play, XCircle } from "lucide-react";

export type WorkOrderPart = {
  id: string;
  itemName: string;
  quantity: number;
  unitPriceCents: number;
};

export type WorkOrderItemOption = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

export type WorkOrderDetail = {
  id: string;
  vehicleReg: string | null;
  customerName: string | null;
  customerContact: string | null;
  status: WorkOrderStatus;
  labourCents: number;
  partsTotalCents: number;
  notes: string | null;
  shopName: string | null;
  createdByName: string | null;
  createdAt: string;
};

export function WorkOrderDetailModal({
  workOrder,
  parts,
  items,
  canEdit,
  trigger,
}: {
  workOrder: WorkOrderDetail;
  parts: WorkOrderPart[];
  items: WorkOrderItemOption[];
  canEdit: boolean;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [addState, addAction, addPending] = useActionState(
    async (_prev: unknown, formData: FormData) => addWorkOrderPart(formData),
    undefined,
  );
  const addResult = addState as { ok?: boolean; error?: string } | undefined;

  const [updateState, updateAction, updatePending] = useActionState(
    async (_prev: unknown, formData: FormData) => updateWorkOrder(formData),
    undefined,
  );
  const updateResult = updateState as { ok?: boolean; error?: string } | undefined;

  const [statusState, statusAction, statusPending] = useActionState(
    async (_prev: unknown, formData: FormData) => setWorkOrderStatus(formData),
    undefined,
  );
  const statusResult = statusState as { ok?: boolean; error?: string } | undefined;

  const notified = useRef<Record<"add" | "update" | "status", boolean>>({
    add: false,
    update: false,
    status: false,
  });
  useEffect(() => {
    if (!open) {
      notified.current = { add: false, update: false, status: false };
      return;
    }
    const outcomes = [
      { key: "add" as const, ok: !!addResult?.ok, title: "Part added" },
      { key: "update" as const, ok: !!updateResult?.ok, title: "Work order updated" },
      { key: "status" as const, ok: !!statusResult?.ok, title: "Work order status updated" },
    ];
    for (const outcome of outcomes) {
      if (!outcome.ok) {
        notified.current[outcome.key] = false;
        continue;
      }
      if (!notified.current[outcome.key]) {
        notified.current[outcome.key] = true;
        toast({ title: outcome.title });
        router.refresh();
      }
    }
  }, [open, addResult, updateResult, statusResult, router, toast]);

  const locked = workOrder.status === "completed" || workOrder.status === "cancelled";
  const totalCents = workOrder.labourCents + workOrder.partsTotalCents;
  const inStockItems = items.filter((i) => i.quantity > 0);

  const canStart = workOrder.status === "open";
  const canComplete = workOrder.status === "open" || workOrder.status === "in_progress";
  const canCancel = workOrder.status === "open" || workOrder.status === "in_progress";

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Work order ${workOrder.vehicleReg || "—"}`}
        description={
          workOrder.shopName
            ? `#${workOrder.id.slice(0, 8).toUpperCase()} · ${workOrder.shopName}`
            : undefined
        }
        size="lg"
      >
        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {workOrder.vehicleReg || "—"}
              </p>
              <WorkOrderStatusBadge status={workOrder.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Customer</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{workOrder.customerName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Contact</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{workOrder.customerContact || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Created</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{workOrder.createdAt}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Created by</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{workOrder.createdByName || "—"}</dd>
              </div>
            </dl>
            {workOrder.notes && (
              <p className="mt-3 border-t border-zinc-100 dark:border-zinc-800/70 pt-3 text-sm text-zinc-700 dark:text-zinc-300">
                {workOrder.notes}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-zinc-100 dark:border-zinc-800/70 pt-3 text-sm">
              <span className="text-muted">
                Labour{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {formatMoney(workOrder.labourCents)}
                </span>
              </span>
              <span className="text-muted">
                Parts{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {formatMoney(workOrder.partsTotalCents)}
                </span>
              </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Total {formatMoney(totalCents)}
              </span>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Parts</h3>
            {parts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-6 text-center text-sm text-muted">
                No parts added yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                    {parts.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{p.itemName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{p.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(p.unitPriceCents)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatMoney(p.unitPriceCents * p.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {canEdit && !locked && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add part</h3>
              {inStockItems.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-6 text-center text-sm text-muted">
                  No items in stock to add.
                </p>
              ) : (
                <form action={addAction} className="flex flex-col gap-3">
                  <input type="hidden" name="workOrderId" value={workOrder.id} />
                  {addResult?.error && <FormError>{addResult.error}</FormError>}
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-48 flex-1">
                      <Label htmlFor="itemId">Item</Label>
                      <Select id="itemId" name="itemId" required defaultValue="">
                        <option value="" disabled>
                          Select an item…
                        </option>
                        {inStockItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} — {formatMoney(item.unitPriceCents)} ({item.quantity} on
                            hand)
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue="1"
                        required
                      />
                    </div>
                    <Button type="submit" loading={addPending}>
                      Add part
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {canEdit && !locked && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Labour & notes</h3>
              <form action={updateAction} className="flex flex-col gap-3">
                <input type="hidden" name="id" value={workOrder.id} />
                <input type="hidden" name="vehicleReg" value={workOrder.vehicleReg ?? ""} />
                <input type="hidden" name="customerName" value={workOrder.customerName ?? ""} />
                <input
                  type="hidden"
                  name="customerContact"
                  value={workOrder.customerContact ?? ""}
                />
                {updateResult?.error && <FormError>{updateResult.error}</FormError>}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="labour">Labour</Label>
                    <Input
                      id="labour"
                      name="labour"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={(workOrder.labourCents / 100).toFixed(2)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={workOrder.notes ?? ""} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" loading={updatePending}>
                    Save labour & notes
                  </Button>
                </div>
              </form>
            </div>
          )}

          {(canStart || canComplete || canCancel) && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Status</h3>
              {statusResult?.error && <FormError>{statusResult.error}</FormError>}
              <div className="flex flex-wrap gap-2">
                {canStart && (
                  <form action={statusAction}>
                    <input type="hidden" name="id" value={workOrder.id} />
                    <input type="hidden" name="status" value="in_progress" />
                    <Button type="submit" variant="secondary" loading={statusPending}>
                      <Play className="size-4" /> Start
                    </Button>
                  </form>
                )}
                {canComplete && (
                  <form action={statusAction}>
                    <input type="hidden" name="id" value={workOrder.id} />
                    <input type="hidden" name="status" value="completed" />
                    <Button type="submit" loading={statusPending}>
                      <CheckCircle2 className="size-4" /> Complete
                    </Button>
                  </form>
                )}
                {canCancel && (
                  <form action={statusAction}>
                    <input type="hidden" name="id" value={workOrder.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <Button type="submit" variant="danger" loading={statusPending}>
                      <XCircle className="size-4" /> Cancel
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
