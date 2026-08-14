"use client";

import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900",
        size === "sm" ? "size-6" : "size-8",
      )}
    >
      <Wrench className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
    </div>
  );
}

export function SidebarHeader({
  brand,
  collapsed,
}: {
  brand: string;
  collapsed: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-14 w-full shrink-0 items-center border-b border-zinc-200 dark:border-zinc-800",
        collapsed ? "justify-center px-0" : "px-3",
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-2.5",
          collapsed && "justify-center",
        )}
      >
        <BrandMark />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {brand}
            </p>
            <p className="text-[11px] text-muted">Inventory platform</p>
          </div>
        )}
      </div>
    </div>
  );
}
