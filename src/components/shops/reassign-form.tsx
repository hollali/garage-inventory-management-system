"use client";

import { useActionState } from "react";
import { reassignAttendant } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Label, Select, FormError } from "@/components/ui/forms";

export type ReassignOption = {
  id: string;
  name: string;
  email: string;
  assignedShopName: string | null;
};

export function ReassignForm({
  shopId,
  currentAttendantId,
  options,
}: {
  shopId: string;
  currentAttendantId: string | null;
  options: ReassignOption[];
}) {
  const [state, action, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => reassignAttendant(formData),
    undefined,
  );
  const actionState = state as { error?: string } | undefined;

  const eligible = options.filter(
    (a) => a.id === currentAttendantId || a.assignedShopName === null,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="shopId" value={shopId} />
      {actionState?.error && <FormError>{actionState.error}</FormError>}
      <div>
        <Label htmlFor="attendantId">Assigned attendant</Label>
        <Select id="attendantId" name="attendantId" defaultValue={currentAttendantId ?? ""}>
          <option value="">Unassign</option>
          {eligible.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {a.email}
              {a.id !== currentAttendantId && a.assignedShopName
                ? ` (${a.assignedShopName})`
                : ""}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        Save assignment
      </Button>
    </form>
  );
}
