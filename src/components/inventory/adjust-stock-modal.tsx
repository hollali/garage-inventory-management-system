"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { adjustStockAdmin } from "@/lib/actions/admin";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FormError } from "@/components/ui/forms";

export function AdjustStockModal({
  item,
  trigger,
  action = adjustStockAdmin,
}: {
  item: { id: string; name: string; quantity: number };
  trigger: ReactNode;
  action?: (formData: FormData) => Promise<unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => action(formData),
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
      <Modal open={open} onClose={() => setOpen(false)} title={`Adjust stock · ${item.name}`}>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="itemId" value={item.id} />
          {actionState?.error && <FormError>{actionState.error}</FormError>}

          <p className="text-sm text-muted">
            On hand: <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.quantity}</span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select id="type" name="type" defaultValue="in">
                <option value="in">Stock in</option>
                <option value="out">Stock out</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                step="1"
                required
                placeholder="0"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="reason">Reason</Label>
              <Select id="reason" name="reason" defaultValue="adjustment">
                <option value="restock">Restock</option>
                <option value="damage">Damage</option>
                <option value="transfer">Transfer</option>
                <option value="adjustment">Adjustment</option>
                <option value="sale">Sale</option>
                <option value="return">Return</option>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" name="note" placeholder="Optional note" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Record movement
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
