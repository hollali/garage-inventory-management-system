"use client";

import { useActionState } from "react";
import { assignAttendantToShop, removeAttendantFromShop } from "@/lib/actions/admin";
import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Label, Select, FormError } from "@/components/ui/forms";
import { UserMinus } from "lucide-react";

export type ShopAttendant = {
  id: string;
  name: string;
  username: string;
  active: boolean;
};

export type AttendantCandidate = {
  id: string;
  name: string;
  username: string;
};

export function AttendantsManager({
  shopId,
  attendants,
  candidates,
}: {
  shopId: string;
  attendants: ShopAttendant[];
  candidates: AttendantCandidate[];
}) {
  const [state, addAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => assignAttendantToShop(formData),
    undefined,
  );
  const actionState = state as { ok?: boolean; error?: string } | undefined;

  return (
    <div className="flex flex-col gap-4">
      {attendants.length === 0 ? (
        <p className="text-sm text-muted">No attendants assigned to this shop yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {attendants.map((attendant) => (
            <li key={attendant.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {attendant.name}
                </p>
                <p className="truncate text-xs text-muted">@{attendant.username}</p>
              </div>
              <ConfirmAction
                action={removeAttendantFromShop}
                hiddenFields={{ shopId, attendantId: attendant.id }}
                confirmTitle="Remove this attendant?"
                confirmBody={`${attendant.name} will no longer have access to this shop.`}
                successMessage="Attendant removed"
                buttonProps={{ variant: "ghost" }}
              >
                <Button type="button" variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700">
                  <UserMinus className="size-4" />
                </Button>
              </ConfirmAction>
            </li>
          ))}
        </ul>
      )}

      <form action={addAction} className="flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800/70">
        {actionState?.error && <FormError>{actionState.error}</FormError>}
        <input type="hidden" name="shopId" value={shopId} />
        <div>
          <Label htmlFor={`add-attendant-${shopId}`}>Add attendant</Label>
          <Select id={`add-attendant-${shopId}`} name="attendantId" defaultValue="">
            <option value="">Select an attendant…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — @{c.username}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          loading={pending}
          disabled={candidates.length === 0}
          className="self-start"
        >
          Add attendant
        </Button>
        {candidates.length === 0 && (
          <p className="text-xs text-muted">
            All other attendants are already assigned. Create a new attendant first.
          </p>
        )}
      </form>
    </div>
  );
}