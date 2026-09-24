import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-zinc-200/60 dark:bg-zinc-800/70",
        className,
      )}
    />
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="border-b border-border bg-surface-subtle px-3 py-3">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="divide-y divide-border/70">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-4">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="hidden h-3.5 w-20 sm:block" />
            <Skeleton className="hidden h-3.5 w-16 md:block" />
            <Skeleton className="hidden h-3.5 w-14 lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
