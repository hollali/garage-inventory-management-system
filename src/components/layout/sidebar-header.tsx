"use client";

import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({
  size = "sm",
  logoUrl,
  brandName,
  className,
}: {
  size?: "sm" | "md";
  logoUrl?: string | null;
  brandName?: string;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
          size === "sm" ? "size-7" : "size-9",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={brandName ? `${brandName} logo` : "Logo"}
          className="size-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm",
        size === "sm" ? "size-7" : "size-9",
        className,
      )}
    >
      <Wrench className={size === "sm" ? "size-4" : "size-4.5"} aria-hidden />
    </div>
  );
}

export function SidebarHeader({
  brand,
  collapsed,
  action,
  logoUrl,
}: {
  brand: string;
  collapsed: boolean;
  action?: React.ReactNode;
  logoUrl?: string | null;
}) {
  return (
    <div data-sidebar-divider className="flex h-16 w-full shrink-0 items-center gap-1 border-b py-2 pr-2 pl-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {collapsed ? (
          <BrandMark logoUrl={logoUrl} brandName={brand} className="mx-auto" />
        ) : (
          <>
            <BrandMark logoUrl={logoUrl} brandName={brand} size="md" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-foreground">{brand}</p>
              <p className="text-[11px] text-muted">Inventory platform</p>
            </div>
          </>
        )}
      </div>
      {action}
    </div>
  );
}
