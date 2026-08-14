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
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-surface/50 px-6 py-14 text-center dark:border-zinc-700",
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
        {icon ?? <Inbox className="size-5" aria-hidden />}
      </div>
      <h3 className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function BoxIcon({ className }: { className?: string }) {
  return <Package className={className} aria-hidden />;
}
