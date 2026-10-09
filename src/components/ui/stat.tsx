import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const iconTones: Record<string, string> = {
  default:
    "bg-surface-strong text-zinc-600 dark:text-zinc-300",
  danger: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  info: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
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
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-[13px] font-medium text-muted">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]",
              iconTones[accent ?? "default"],
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {sub && <div className="mt-1.5 text-xs text-muted">{sub}</div>}
      </div>
    </div>
  );

  const cardClass =
    "rounded-2xl border border-border bg-surface p-5 shadow-card transition-[box-shadow,transform] duration-200";

  if (!href) {
    return <div className={cardClass}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        cardClass,
        "group block hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
    >
      {body}
    </Link>
  );
}
