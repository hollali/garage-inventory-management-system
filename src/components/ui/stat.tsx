import * as React from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "default" | "danger" | "success" | "warning";
}) {
  const accents = {
    default: "bg-brand-soft text-brand",
    danger: "bg-red-100 text-red-600",
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-amber-100 text-amber-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
        </div>
        {icon && (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg animate-float",
              accents[accent ?? "default"],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
