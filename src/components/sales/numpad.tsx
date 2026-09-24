import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

export function Numpad({
  onInput,
  className,
}: {
  onInput: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-1.5 rounded-xl border border-border-strong bg-surface p-2",
        className,
      )}
    >
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onInput(key === "back" ? "back" : key)}
          aria-label={key === "back" ? "Backspace" : key}
          className="h-9 rounded-lg bg-surface-strong text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-200/70 active:scale-[0.97] dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          {key === "back" ? (
            <Delete className="mx-auto size-4" aria-hidden />
          ) : (
            key
          )}
        </button>
      ))}
    </div>
  );
}

export function applyKey(value: string, key: string): string {
  if (key === "back") return value.slice(0, -1);
  if (key === ".") {
    if (value.includes(".")) return value;
    return value === "" ? "0." : `${value}.`;
  }
  return value === "0" ? key : `${value}${key}`;
}