"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createAttendant } from "@/lib/actions/admin";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FormError } from "@/components/ui/forms";
import { useToast } from "@/components/ui/toast";

export function AttendantModal({
  shops,
  trigger,
}: {
  shops: { id: string; name: string }[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => createAttendant(formData),
    undefined,
  );
  const actionState = state as { ok?: boolean; error?: string } | undefined;

  const prevOk = useRef(false);
  useEffect(() => {
    if (open && actionState?.ok && !prevOk.current) {
      prevOk.current = true;
      setOpen(false);
      toast({ title: "Attendant created" });
      router.refresh();
    }
    if (!actionState?.ok) prevOk.current = false;
  }, [open, actionState, router, toast]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="Create attendant">
        <form action={formAction} className="flex flex-col gap-4">
          {actionState?.error && <FormError>{actionState.error}</FormError>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required placeholder="e.g. Jordan Smith" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="attendant@garage.io" />
            </div>
            <div>
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
              <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
            </div>
            <div>
              <Label htmlFor="shopId">Assign to shop (optional)</Label>
              <Select id="shopId" name="shopId" defaultValue="">
                <option value="">No shop yet</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Create attendant
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
