"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, FormError, FormSuccess } from "@/components/ui/forms";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  if (state?.message === "Your password has been reset. You can now sign in.") {
    return (
      <div className="flex flex-col gap-4">
        <FormSuccess>{state.message}</FormSuccess>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-base font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {state?.message && <FormError>{state.message}</FormError>}
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        {state?.errors?.map((e) => (
          <FieldError key={e}>{e}</FieldError>
        ))}
      </div>
      <Button type="submit" size="lg" loading={pending}>
        Reset password
      </Button>
    </form>
  );
}
