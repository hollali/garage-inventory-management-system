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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <Button type="submit" size="lg" loading={pending}>
            Send reset link
          </Button>
        </>
      )}
    </form>
  );
}
