"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FormSuccess } from "@/components/ui/forms";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => requestPasswordReset(formData),
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.message && <FormSuccess>{state.message}</FormSuccess>}
      {!state?.message && (
        <>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="your-username"
              required
            />
            <p className="mt-1 text-xs text-muted">
              A reset link will be emailed to the address on your account.
            </p>
          </div>
          <Button type="submit" size="lg" loading={pending}>
            Send reset link
          </Button>
        </>
      )}
    </form>
  );
}
