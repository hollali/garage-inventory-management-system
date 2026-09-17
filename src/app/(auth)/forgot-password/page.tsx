import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthHeading } from "@/components/auth/auth-heading";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-5">
      <AuthHeading
        title="Reset your password"
        description="Enter your username and we'll email you a password reset link."
      />
      <ForgotPasswordForm />
      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-brand hover:text-brand-hover">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
