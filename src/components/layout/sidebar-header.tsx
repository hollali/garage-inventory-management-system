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
  action,
}: {
  brand: string;
  collapsed: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-14 w-full shrink-0 items-center gap-1 border-b border-zinc-200 py-2 pr-2 pl-3 dark:border-zinc-800">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
      {action}
    </div>
  );
}
