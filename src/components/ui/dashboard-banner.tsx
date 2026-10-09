import type { ReactNode } from "react";

export function DashboardBanner({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="dashboard-banner relative isolate overflow-hidden rounded-2xl border border-border px-5 py-6 text-foreground shadow-card sm:px-8 sm:py-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] [background-image:linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:34px_34px] [mask-image:linear-gradient(90deg,black,transparent_85%)] dark:opacity-[0.06]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 right-12 -z-10 size-72 rounded-full bg-brand/15 blur-[90px]"
      />
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="min-w-0 max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-brand uppercase">
            <span className="size-1.5 rounded-full bg-brand shadow-[0_0_12px_color-mix(in_srgb,var(--color-brand)_60%,transparent)]" />
            {eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-[30px]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 [&>a]:shadow-sm">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
