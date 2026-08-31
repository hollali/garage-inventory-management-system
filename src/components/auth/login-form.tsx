"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { needsTotp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, FormError } from "@/components/ui/forms";
import { PasswordInput } from "@/components/ui/password-input";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const totpCode = String(formData.get("totpCode") ?? "");

    try {
      if (!otpRequired) {
        const result = await needsTotp(email);
        if (result.error) {
          setError(result.error);
          setPending(false);
          return;
        }
        if (result.requires) {
          setOtpRequired(true);
          setPending(false);
          return;
        }
      }

      const res = await signIn("credentials", {
        email,
        password,
        totpCode,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password.");
        setPending(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <FormError>{error}</FormError>}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="mb-1.5 text-xs font-medium text-brand hover:text-brand-hover"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>
      {otpRequired && (
        <div>
          <Label htmlFor="totpCode">Two-factor code</Label>
          <Input
            id="totpCode"
            name="totpCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]*"
            required
          />
        </div>
      )}
      <Button type="submit" size="lg" loading={pending} className="mt-2">
        Sign in
      </Button>
      {otpRequired && (
        <button
          type="button"
          onClick={() => setOtpRequired(false)}
          className="text-xs font-medium text-brand hover:text-brand-hover"
        >
          Back
        </button>
      )}
    </form>
  );
}
