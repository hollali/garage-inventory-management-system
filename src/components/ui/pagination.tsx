"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
    "rounded-lg border px-2.5 py-1.5 text-sm text-slate-700";

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-muted">
        Showing {from}–{to} of {total}
      </p>
      <nav className="flex flex-wrap items-center gap-1" aria-label="Pagination">
        {prevDisabled ? (
          <span aria-disabled="true" className={cn(controlClasses, "opacity-40")}>
            ← Prev
          </span>
        ) : (
          <Link href={href(page - 1)} className={cn(controlClasses, "hover:bg-slate-50")}>
            ← Prev
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
                "rounded-lg px-2.5 py-1.5 text-sm",
                p === page ? "bg-brand text-white" : "border text-slate-700 hover:bg-slate-50",
              )}
            >
              {p}
            </Link>
          ),
        )}
        {nextDisabled ? (
          <span aria-disabled="true" className={cn(controlClasses, "opacity-40")}>
            Next →
          </span>
        ) : (
          <Link href={href(page + 1)} className={cn(controlClasses, "hover:bg-slate-50")}>
            Next →
          </Link>
        )}
      </nav>
    </div>
  );
}
