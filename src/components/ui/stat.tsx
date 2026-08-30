import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const iconTones: Record<string, string> = {
  default: "text-zinc-500 dark:text-zinc-400",
  danger: "text-rose-600 dark:text-rose-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-sky-600 dark:text-sky-400",
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "default" | "danger" | "success" | "warning" | "info";
  href?: string;
}) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="mt-1.5 truncate font-mono text-xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-100">
          {value}
        </p>
        {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
      </div>
      {icon && (
        <div
          className={cn(
            "mt-0.5 shrink-0 [&_svg]:size-4",
            iconTones[accent ?? "default"],
          )}
        >
          {icon}
        </div>
      )}
    </div>
  );

  const cardClass =
    "rounded-lg border border-zinc-200 bg-surface p-4 shadow-sm dark:border-zinc-800";

  if (!href) {
    return <div className={cardClass}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        cardClass,
        "block transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:hover:bg-zinc-800/40",
      )}
    >
      {body}
    </Link>
  );
}
