import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

const variants: Record<Variant, string> = {
  default: "bg-orange-100 text-orange-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-800",
  neutral: "bg-slate-100 text-slate-700",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function LowStockBadge({ quantity, threshold }: { quantity: number; threshold: number }) {
  if (quantity <= 0) return <Badge variant="danger">Out of stock</Badge>;
  if (quantity <= threshold) return <Badge variant="warning">Low stock</Badge>;
  return <Badge variant="success">In stock</Badge>;
}
