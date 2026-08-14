import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type AttentionRow = {
  id: string;
  label: string;
  meta: string;
};

type AttentionCardProps = {
  title: string;
  href: string;
  hrefLabel: string;
  count: number;
  icon: ReactNode;
  rows: AttentionRow[];
};

export function AttentionCard({
  title,
  href,
  hrefLabel,
  count,
  icon,
  rows,
}: AttentionCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span className="text-zinc-400 [&_svg]:size-4">{icon}</span>
          {title}
        </CardTitle>
        <Badge variant="warning">{count}</Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Nothing to review.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={href}
                  className="-mx-2 block rounded-md px-2 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                >
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {row.label}
                  </p>
                  <p className="text-xs text-muted">{row.meta}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-0.5 text-xs font-medium text-zinc-900 transition-colors hover:text-zinc-500 dark:text-zinc-200 dark:hover:text-zinc-400"
        >
          {hrefLabel}
          <ChevronRight className="size-3" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
