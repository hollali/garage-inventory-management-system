import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-3", className)}>
      <div className="min-w-0 max-w-full">
        <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-foreground sm:text-[30px]">{title}</h1>
        {description && <div className="mt-1.5 text-sm leading-6 text-muted">{description}</div>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      )}
    </div>
  );
}
