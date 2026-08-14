import * as React from "react";
import { cn } from "@/lib/utils";

export type BarChartDatum = {
  label: string;
  value: number;
};

const GRID_TICKS = 4;

function niceMax(max: number): number {
  const ticks = GRID_TICKS;
  const step = Math.max(1, Math.ceil(max / ticks));
  return step * ticks;
}

export function BarChart({
  data,
  height = 220,
  formatValue = (n: number) => String(n),
  className,
}: {
  data: BarChartDatum[];
  height?: number;
  formatValue?: (n: number) => string;
  className?: string;
}) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));

  const summary = data
    .map((d) => `${d.label}=${formatValue(d.value)}`)
    .join(", ");

  if (data.length === 0) {
    return (
      <div
        className={cn("flex items-center justify-center text-sm text-muted", className)}
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const n = data.length;

  return (
    <div role="img" aria-label={`Bar chart: ${summary}`} className={cn("flex gap-3", className)}>
      <div
        aria-hidden
        className="flex w-10 shrink-0 flex-col justify-between text-right text-[10px] leading-none text-muted"
        style={{ height }}
      >
        {Array.from({ length: GRID_TICKS + 1 }, (_, i) => (
          <span key={i} className="flex items-center justify-end">
            {formatValue((max / GRID_TICKS) * (GRID_TICKS - i))}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
          >
            {Array.from({ length: GRID_TICKS + 1 }, (_, i) => (
              <line
                key={i}
                x1="0"
                x2="100"
                y1={(i / GRID_TICKS) * 100}
                y2={(i / GRID_TICKS) * 100}
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {data.map((d, i) => {
              const slot = 100 / n;
              const barWidth = slot * 0.62;
              const x = i * slot + (slot - barWidth) / 2;
              const h = max > 0 ? (d.value / max) * 100 : 0;
              return (
                <rect
                  key={i}
                  x={x}
                  y={100 - h}
                  width={barWidth}
                  height={d.value > 0 ? Math.max(h, 1.4) : 0}
                  rx="1"
                  className="fill-brand"
                >
                  <title>{`${d.label}: ${formatValue(d.value)}`}</title>
                </rect>
              );
            })}
          </svg>
        </div>
        <div className="mt-1.5 flex">
          {data.map((d, i) => (
            <span
              key={i}
              className="flex-1 truncate px-0.5 text-center text-[10px] leading-none text-muted"
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
