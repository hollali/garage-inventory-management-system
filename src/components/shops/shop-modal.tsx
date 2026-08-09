"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createShop } from "@/lib/actions/admin";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FormError } from "@/components/ui/forms";

export type ShopAttendantOption = {
  id: string;
  name: string;
  email: string;
  assignedShopName: string | null;
};

export function ShopModal({
  attendants,
  trigger,
}: {
  attendants: ShopAttendantOption[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => createShop(formData),
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

  const assignable = attendants.filter((a) => !a.assignedShopName);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="Create a shop">
        <form action={formAction} className="flex flex-col gap-4">
          {actionState?.error && <FormError>{actionState.error}</FormError>}
          <div>
            <Label htmlFor="name">Shop name</Label>
            <Input id="name" name="name" required placeholder="e.g. Downtown Garage" />
          </div>
          <div>
            <Label htmlFor="location">Location / address</Label>
            <Input id="location" name="location" required placeholder="e.g. 42 Main Street" />
          </div>
          <div>
            <Label htmlFor="attendantId">Assigned attendant</Label>
            <Select id="attendantId" name="attendantId" defaultValue="">
              <option value="">No attendant (assign later)</option>
              {assignable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.email}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted">
              {assignable.length === 0
                ? "All attendants are already assigned to a shop. Create an attendant first."
                : `${assignable.length} unassigned attendant(s) available.`}
            </p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Optional notes about this shop…" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Create shop
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
