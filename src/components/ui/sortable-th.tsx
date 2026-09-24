import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function SortableTh({
  base,
  params,
  column,
  label,
  align,
  className,
}: {
  base: string;
  params: Record<string, string | undefined>;
  column: string;
  label: string;
  align?: "right";
  className?: string;
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
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(
        "px-3 py-3 text-xs font-medium whitespace-nowrap text-muted",
        className,
      )}
    >
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          align === "right" && "justify-end",
          active && "text-foreground",
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : (
            <ArrowDown className="size-3" aria-hidden />
          )
        ) : (
          <ChevronsUpDown className="size-3 text-zinc-400 opacity-70" aria-hidden />
        )}
      </Link>
    </th>
  );
}
