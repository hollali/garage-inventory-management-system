import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-zinc-200/70 dark:bg-zinc-800",
        className,
      )}
    />
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
      <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-3">
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
