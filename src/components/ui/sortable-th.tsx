import Link from "next/link";
import { cn } from "@/lib/utils";

export function SortableTh({
  base,
  params,
  column,
  label,
  align,
}: {
  base: string;
  params: Record<string, string | undefined>;
  column: string;
  label: string;
  align?: "right";
}) {
  const current = params.sort;
  const dir = params.dir;
  const nextDir = current === column && dir !== "desc" ? "desc" : "asc";

  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) p.set(key, value);
  }
  p.set("sort", column);
  p.set("dir", nextDir);
  p.delete("page");
  const href = `${base}?${p.toString()}`;
  const active = current === column;

  return (
    <th
      scope="col"
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted"
    >
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1 hover:text-slate-900",
          align === "right" && "justify-end",
          active && "text-brand",
        )}
      >
        {label}
        <span className="text-[10px] leading-none" aria-hidden>
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </th>
  );
}
