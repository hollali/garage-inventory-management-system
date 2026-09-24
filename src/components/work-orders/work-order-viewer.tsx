"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addWorkOrderPart,
  removeWorkOrderPart,
  setWorkOrderStatus,
  updateWorkOrder,
} from "@/lib/actions/work-orders";
import { formatMoney } from "@/lib/utils";
import { formDataToRecord } from "@/lib/offline/queue";
import { useOffline } from "@/components/offline/offline-provider";
import { Button } from "@/components/ui/button";
import {
  Label,
  Input,
  Select,
  Textarea,
  FormError,
} from "@/components/ui/forms";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { WorkOrderStatusBadge, type WorkOrderStatus } from "./work-order-status";
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  Trash2,
  XCircle,
} from "lucide-react";

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
  available: number;
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

type ActionState = { ok?: boolean; error?: string } | undefined;

function useOfflineAction(
  action: (formData: FormData) => Promise<ActionState>,
  successTitle: string,
) {
  const router = useRouter();
  const { toast } = useToast();
  const { isOnline, enqueue } = useOffline();
  const [state, run, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => action(formData),
    undefined,
  );
  const result = state as ActionState;

  const notified = useRef(false);
  useEffect(() => {
    if (!result) {
      notified.current = false;
      return;
    }
    if (!result.ok || notified.current) return;
    notified.current = true;
    toast({ title: successTitle });
    router.refresh();
  }, [result, router, toast, successTitle]);

  return {
    isOnline,
    enqueue,
    toast,
    result,
    run,
    pending,
  };
}

export function WorkOrderViewer({
  workOrder,
  parts,
  items,
  canEdit,
  backHref,
}: {
  workOrder: WorkOrderDetail;
  parts: WorkOrderPart[];
  items: WorkOrderItemOption[];
  canEdit: boolean;
  backHref: string;
}) {
  const locked = workOrder.status === "completed" || workOrder.status === "cancelled";
  const totalCents = workOrder.labourCents + workOrder.partsTotalCents;
  const availableItems = items.filter((i) => i.available > 0);

  const canStart = workOrder.status === "open";
  const canComplete = workOrder.status === "open" || workOrder.status === "in_progress";
  const canCancel = workOrder.status === "open" || workOrder.status === "in_progress";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to work orders
      </Link>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-lg font-semibold text-foreground">
                {workOrder.vehicleReg || "—"}
              </p>
              <WorkOrderStatusBadge status={workOrder.status} />
              {workOrder.shopName && (
                <span className="text-sm text-muted">
                  #{workOrder.id.slice(0, 8).toUpperCase()} · {workOrder.shopName}
                </span>
              )}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Customer</dt>
              <dd className="mt-0.5 font-medium text-foreground">{workOrder.customerName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Contact</dt>
              <dd className="mt-0.5 font-medium text-foreground">{workOrder.customerContact || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Created</dt>
              <dd className="mt-0.5 font-medium text-foreground">{workOrder.createdAt}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Created by</dt>
              <dd className="mt-0.5 font-medium text-foreground">{workOrder.createdByName || "—"}</dd>
            </div>
          </dl>
          {workOrder.notes && (
            <p className="mt-4 border-t border-border pt-4 text-sm text-zinc-600 dark:text-zinc-300">
              {workOrder.notes}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 border-t border-border pt-4 text-sm">
            <span className="text-muted">
              Labour{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatMoney(workOrder.labourCents)}
              </span>
            </span>
            <span className="text-muted">
              Parts{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatMoney(workOrder.partsTotalCents)}
              </span>
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              Total {formatMoney(totalCents)}
            </span>
          </div>
        </CardContent>
      </Card>

      <PartsTable
        workOrderId={workOrder.id}
        parts={parts}
        editable={canEdit && !locked}
      />

      {canEdit && !locked && (
        <AddPartForm workOrderId={workOrder.id} items={availableItems} />
      )}

      {canEdit && !locked && <UpdateWorkOrderForm workOrder={workOrder} />}

      {(canStart || canComplete || canCancel) && (
        <StatusActions workOrder={workOrder} />
      )}
    </div>
  );
}

function PartsTable({
  workOrderId,
  parts,
  editable,
}: {
  workOrderId: string;
  parts: WorkOrderPart[];
  editable: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Parts</h3>
        {parts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted">
            No parts added yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-strong text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  {editable && <th className="px-3 py-2 text-right">Remove</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parts.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-medium text-foreground">{p.itemName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(p.unitPriceCents)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">
                      {formatMoney(p.unitPriceCents * p.quantity)}
                    </td>
                    {editable && (
                      <td className="px-3 py-2 text-right">
                        <RemovePartButton workOrderId={workOrderId} partId={p.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RemovePartButton({ workOrderId, partId }: { workOrderId: string; partId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { isOnline, enqueue } = useOffline();
  const [state, action, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => removeWorkOrderPart(formData),
    undefined,
  );
  const result = state as ActionState;

  const notified = useRef(false);
  useEffect(() => {
    if (!result) {
      notified.current = false;
      return;
    }
    if (!result.ok || notified.current) return;
    notified.current = true;
    toast({ title: "Part removed" });
    router.refresh();
  }, [result, router, toast]);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (isOnline) return;
        e.preventDefault();
        enqueue("removeWorkOrderPart", formDataToRecord(new FormData(e.currentTarget)));
        toast({
          title: "Saved while offline",
          description: "The part will be removed when you reconnect.",
        });
        router.refresh();
      }}
    >
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <input type="hidden" name="partId" value={partId} />
      {result?.error && <FormError>{result.error}</FormError>}
      <Button type="submit" variant="ghost" size="sm" loading={pending} aria-label="Remove part">
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}

function AddPartForm({
  workOrderId,
  items,
}: {
  workOrderId: string;
  items: WorkOrderItemOption[];
}) {
  const { isOnline, enqueue, toast, result, run, pending } = useOfflineAction(
    addWorkOrderPart,
    "Part added",
  );

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Add part</h3>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-strong px-4 py-6 text-center text-sm text-muted">
            No items in stock to add.
          </p>
        ) : (
          <form
            action={run}
            onSubmit={(e) => {
              if (isOnline) return;
              e.preventDefault();
              enqueue("addWorkOrderPart", formDataToRecord(new FormData(e.currentTarget)));
              toast({
                title: "Saved while offline",
                description: "The part will be added when you reconnect.",
              });
            }}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="workOrderId" value={workOrderId} />
            {result?.error && <FormError>{result.error}</FormError>}
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <Label htmlFor="itemId">Item</Label>
                <Select id="itemId" name="itemId" required defaultValue="">
                  <option value="" disabled>
                    Select an item…
                  </option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {formatMoney(item.unitPriceCents)} ({item.available} on
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
              <Button type="submit" loading={pending}>
                Add part
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function UpdateWorkOrderForm({ workOrder }: { workOrder: WorkOrderDetail }) {
  const { isOnline, enqueue, toast, result, run, pending } = useOfflineAction(
    updateWorkOrder,
    "Work order updated",
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <h3 className="text-sm font-semibold text-foreground">Labour & notes</h3>
        <form
          action={run}
          onSubmit={(e) => {
            if (isOnline) return;
            e.preventDefault();
            enqueue("updateWorkOrder", formDataToRecord(new FormData(e.currentTarget)));
            toast({
              title: "Saved while offline",
              description: "Changes will be saved when you reconnect.",
            });
          }}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="id" value={workOrder.id} />
          <input type="hidden" name="vehicleReg" value={workOrder.vehicleReg ?? ""} />
          <input type="hidden" name="customerName" value={workOrder.customerName ?? ""} />
          <input
            type="hidden"
            name="customerContact"
            value={workOrder.customerContact ?? ""}
          />
          {result?.error && <FormError>{result.error}</FormError>}
          <div className="grid gap-3 sm:max-w-xs">
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
            <Button type="submit" loading={pending}>
              Save labour & notes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function StatusActions({ workOrder }: { workOrder: WorkOrderDetail }) {
  const canStart = workOrder.status === "open";
  const canComplete = workOrder.status === "open" || workOrder.status === "in_progress";
  const canCancel = workOrder.status === "open" || workOrder.status === "in_progress";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <h3 className="text-sm font-semibold text-foreground">Status</h3>
        <div className="flex flex-wrap gap-2">
          {canStart && <StatusButton status="in_progress" icon={<Play className="size-4" />} label="Start" variant="secondary" workOrder={workOrder} />}
          {canComplete && <StatusButton status="completed" icon={<CheckCircle2 className="size-4" />} label="Complete" variant="primary" workOrder={workOrder} />}
          {canCancel && <StatusButton status="cancelled" icon={<XCircle className="size-4" />} label="Cancel" variant="danger" workOrder={workOrder} />}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusButton({
  workOrder,
  status,
  label,
  icon,
  variant,
}: {
  workOrder: WorkOrderDetail;
  status: "open" | "in_progress" | "completed" | "cancelled";
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "danger";
}) {
  const { isOnline, enqueue, toast, result, run, pending } = useOfflineAction(
    setWorkOrderStatus,
    "Work order status updated",
  );

  return (
    <form
      action={run}
      onSubmit={(e) => {
        if (isOnline) return;
        e.preventDefault();
        enqueue("setWorkOrderStatus", formDataToRecord(new FormData(e.currentTarget)));
        toast({
          title: "Saved while offline",
          description: "The status change will be sent when you reconnect.",
        });
      }}
    >
      <input type="hidden" name="id" value={workOrder.id} />
      <input type="hidden" name="status" value={status} />
      {result?.error ? (
        <div className="mb-2">
          <FormError>{result.error}</FormError>
        </div>
      ) : null}
      <Button type="submit" variant={variant} loading={pending}>
        {icon} {label}
      </Button>
    </form>
  );
}