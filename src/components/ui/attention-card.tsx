import Link from "next/link";
import type { ReactNode } from "react";
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
          <span className="text-brand">{icon}</span>
          {title}
        </CardTitle>
        <Badge variant="warning">{count}</Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Nothing to review.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={href} className="-mx-2 block rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50">
                  <p className="truncate text-sm font-medium text-slate-900">{row.label}</p>
                  <p className="text-xs text-muted">{row.meta}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={href}
          className="mt-3 inline-block text-xs font-medium text-brand hover:text-brand-hover"
        >
          {hrefLabel}
        </Link>
      </CardContent>
    </Card>
  );
}
