import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

const variants: Record<Variant, string> = {
  default:
    "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/10 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-500/20",
  neutral:
    "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/10 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-500/20",
  success:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  warning:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  danger:
    "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
  info:
    "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20",
};

export const dotColors: Record<Variant, string> = {
  default: "bg-zinc-400 dark:bg-zinc-500",
  neutral: "bg-zinc-400 dark:bg-zinc-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
};

export function Badge({
  className,
  variant = "default",
  dot = false,
  pulse = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
  dot?: boolean;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className={cn(
            "relative flex size-1.5 shrink-0 rounded-full",
            dotColors[variant],
            pulse &&
              "before:absolute before:inset-0 before:rounded-full before:bg-current before:opacity-40 before:animate-ping",
          )}
        />
      )}
      {children}
    </span>
  );
}

export function LowStockBadge({ quantity, threshold }: { quantity: number; threshold: number }) {
  if (quantity <= 0) {
    return (
      <Badge variant="danger" dot pulse role="status">
        Out of stock
      </Badge>
    );
  }
  if (quantity <= threshold) {
    return (
      <Badge variant="warning" dot role="status">
        Low stock
      </Badge>
    );
  }
  return (
    <Badge variant="success" dot role="status">
      In stock
    </Badge>
  );
}
