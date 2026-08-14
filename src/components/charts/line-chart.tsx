import * as React from "react";
import { cn } from "@/lib/utils";

export type LineChartDatum = {
  label: string;
  value: number;
};

const GRID_TICKS = 4;

function niceMax(max: number): number {
  const ticks = GRID_TICKS;
  const step = Math.max(1, Math.ceil(max / ticks));
  return step * ticks;
}

function pointKey(id: string, i: number): string {
  return `${id}-p-${i}`;
}

export function LineChart({
  data,
  height = 220,
  formatValue = (n: number) => String(n),
  className,
}: {
  data: LineChartDatum[];
  height?: number;
  formatValue?: (n: number) => string;
  className?: string;
}) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));

  const summary = data.map((d) => `${d.label}=${formatValue(d.value)}`).join(", ");

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
  const pts = data.map((d, i) => {
    const x = n === 1 ? 100 : (i / (n - 1)) * 100;
    const y = max > 0 ? 100 - (d.value / max) * 100 : 100;
    return { i, x, y, label: d.label, value: d.value };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} 100 L ${pts[0].x} 100 Z`;

  return (
    <div role="img" aria-label={`Line chart: ${summary}`} className={cn("flex gap-3", className)}>
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
            <path
              d={areaPath}
              className="fill-zinc-900/[0.07] dark:fill-zinc-100/[0.07]"
            />
            <path
              d={linePath}
              fill="none"
              className="stroke-brand"
              strokeWidth="1.6"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {pts.map((p) => (
            <span
              key={pointKey(id, p.i)}
              title={`${p.label}: ${formatValue(p.value)}`}
              className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-surface"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex">
          {data.map((d, i) => (
            <span
              key={pointKey(id, i)}
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
