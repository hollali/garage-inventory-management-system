"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createShop } from "@/lib/actions/admin";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, FormError } from "@/components/ui/forms";
import { useToast } from "@/components/ui/toast";
import { useUrlModal } from "@/components/ui/use-url-modal";

export type ShopAttendantOption = {
  id: string;
  name: string;
  email: string;
};

export function ShopModal({
  attendants,
  trigger,
  urlAction,
}: {
  attendants: ShopAttendantOption[];
  trigger: ReactNode;
  urlAction?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { open: urlOpen, close: closeUrlModal } = useUrlModal(urlAction);
  const [localOpen, setLocalOpen] = useState(false);
  const open = localOpen || urlOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      setLocalOpen(next);
      if (!next) closeUrlModal();
    },
    [closeUrlModal],
  );

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
      toast({ title: "Shop created" });
      router.refresh();
    }
    if (!actionState?.ok) prevOk.current = false;
  }, [open, actionState, router, setOpen, toast]);

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
            <Label htmlFor="attendantId">Assign an attendant (optional)</Label>
            <Select id="attendantId" name="attendantId" defaultValue="">
              <option value="">No attendant (assign later)</option>
              {attendants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.email}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted">
              An attendant can work at multiple shops. Manage assignments later too.
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
