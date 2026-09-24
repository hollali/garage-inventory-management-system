import * as React from "react";
import { Inbox, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-subtle/60 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-zinc-400 shadow-sm">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </div>
      <h3 className="mt-2 text-sm font-medium text-foreground">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function BoxIcon({ className }: { className?: string }) {
  return <Package className={className} aria-hidden />;
}
