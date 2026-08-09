"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createWorkOrder } from "@/lib/actions/work-orders";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FormError } from "@/components/ui/forms";

export function WorkOrderModal({ trigger }: { trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => createWorkOrder(formData),
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

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New work order"
        description="Open a job card for a vehicle in this shop."
        size="lg"
      >
        <form action={formAction} className="flex flex-col gap-4">
          {actionState?.error && <FormError>{actionState.error}</FormError>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="vehicleReg">Vehicle registration</Label>
              <Input id="vehicleReg" name="vehicleReg" placeholder="e.g. KDL 123J" />
            </div>
            <div>
              <Label htmlFor="customerName">Customer name</Label>
              <Input id="customerName" name="customerName" placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="customerContact">Customer contact</Label>
              <Input id="customerContact" name="customerContact" placeholder="Phone / email — optional" />
            </div>
            <div>
              <Label htmlFor="labour">Labour</Label>
              <Input
                id="labour"
                name="labour"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
                placeholder="0.00"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Work to be done…" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Create work order
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
