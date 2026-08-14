"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  base,
  page,
  totalPages,
  total,
  pageSize,
}: {
  base: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}) {
  const searchParams = useSearchParams();
  if (totalPages <= 1) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function href(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const controlClasses =
    "inline-flex h-7 items-center gap-1 rounded-md border border-zinc-200 px-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800";

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-muted">
        Showing <span className="font-medium text-zinc-900 dark:text-zinc-100">{from}</span>–
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{to}</span> of{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{total}</span>
      </p>
      <nav className="flex flex-wrap items-center gap-1" aria-label="Pagination">
        {prevDisabled ? (
          <span aria-disabled="true" className={cn(controlClasses, "pointer-events-none opacity-40")}>
            <ChevronLeft className="size-3.5" aria-hidden /> Prev
          </span>
        ) : (
          <Link href={href(page - 1)} className={controlClasses}>
            <ChevronLeft className="size-3.5" aria-hidden /> Prev
          </Link>
        )}
        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-sm text-muted">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={href(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-medium transition-colors",
                p === page
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                  : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )}
            >
              {p}
            </Link>
          ),
        )}
        {nextDisabled ? (
          <span aria-disabled="true" className={cn(controlClasses, "pointer-events-none opacity-40")}>
            Next <ChevronRight className="size-3.5" aria-hidden />
          </span>
        ) : (
          <Link href={href(page + 1)} className={controlClasses}>
            Next <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </nav>
    </div>
  );
}
