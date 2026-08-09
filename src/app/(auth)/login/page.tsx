import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthHeading } from "@/components/auth/auth-heading";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-5">
      <AuthHeading
        title="Sign in to your account"
        description="Enter your credentials to continue."
      />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
