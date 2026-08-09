"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createSupplier } from "@/lib/actions/purchasing";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FormError, FormSuccess } from "@/components/ui/forms";

export function SupplierModal({ trigger }: { trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => createSupplier(formData),
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
      <Modal open={open} onClose={() => setOpen(false)} title="Add a supplier">
        <form action={formAction} className="flex flex-col gap-4">
          {actionState?.error && <FormError>{actionState.error}</FormError>}
          {actionState?.ok && <FormSuccess>Supplier created.</FormSuccess>}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="e.g. AutoParts Wholesale" />
          </div>
          <div>
            <Label htmlFor="contactName">Contact name</Label>
            <Input id="contactName" name="contactName" placeholder="Optional" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="Optional" />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" placeholder="Optional" />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Optional notes…" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Add supplier
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
