import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthHeading } from "@/components/auth/auth-heading";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <AuthHeading title="Invalid reset link" />
        <p className="text-sm text-muted">
          This link is missing a reset token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="font-medium text-brand hover:text-brand-hover"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AuthHeading
        title="Choose a new password"
        description="Must be at least 8 characters."
      />
      <ResetPasswordForm token={token} />
    </div>
  );
}
