"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useUrlModal(value?: string) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const close = useCallback(() => {
    if (!searchParams.get("modal")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("modal");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  const open = !!value && searchParams.get("modal") === value;
  return { open, close };
}
