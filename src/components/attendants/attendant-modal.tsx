"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createAttendant } from "@/lib/actions/admin";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/forms";
import { useToast } from "@/components/ui/toast";
import { Store } from "lucide-react";

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
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" required placeholder="e.g. jordan" autoComplete="off" />
              <p className="mt-1 text-xs text-muted">Used to sign in. Letters, numbers, dots, dashes.</p>
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
          </div>
          <div>
            <Label>Assign to shops (optional)</Label>
            {shops.length === 0 ? (
              <p className="text-sm text-muted">No shops exist yet. Create a shop first.</p>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                {shops.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <input
                      type="checkbox"
                      name="shopId"
                      value={s.id}
                      className="size-4 rounded border-zinc-300 accent-zinc-900 dark:border-zinc-600"
                    />
                    <Store className="size-3.5 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 truncate text-zinc-900 dark:text-zinc-100">{s.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-muted">
              An attendant can be assigned to one or more shops.
            </p>
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
