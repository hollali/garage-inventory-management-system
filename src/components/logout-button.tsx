"use client";

import { signOut } from "next-auth/react";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className}
    >
      Sign out
    </button>
  );
}
