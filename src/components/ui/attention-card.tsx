import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type AttentionRow = {
  id: string;
  label: ReactNode;
  meta: ReactNode;
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
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-surface-strong text-zinc-500 [&_svg]:size-4 dark:text-zinc-400">
            {icon}
          </span>
          {title}
        </CardTitle>
        <Badge variant={count > 0 ? "warning" : "neutral"}>{count}</Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Nothing to review.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={href}
                  className="-mx-2 flex flex-col gap-0.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.label}
                  </p>
                  <p className="truncate text-xs text-muted">{row.meta}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 rounded-md text-xs font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {hrefLabel}
          <ChevronRight className="size-3" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}