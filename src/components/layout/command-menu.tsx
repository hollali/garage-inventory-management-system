"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { navIcons, type NavItem } from "@/components/layout/nav";

export type CommandAction = {
  label: string;
  hint?: string;
  href: string;
  icon?: LucideIcon;
};

type GroupedEntry = {
  kind: "action" | "item";
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
};

export function CommandMenu({
  open,
  onClose,
  items,
  quickActions,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  quickActions: CommandAction[];
}) {
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [prevOpen, setPrevOpen] = useState(false);

  if (open && !prevOpen) {
    setPrevOpen(true);
    setQuery("");
    setActive(0);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  const groups: { label: string; entries: GroupedEntry[] }[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (label: string) => !q || label.toLowerCase().includes(q);

    const actions: GroupedEntry[] = quickActions
      .filter((a) => matches(a.label))
      .map((a) => ({
        kind: "action",
        label: a.label,
        hint: a.hint,
        href: a.href,
        icon: a.icon ?? Search,
      }));

    const nav: GroupedEntry[] = items
      .filter((i) => matches(i.label))
      .map((i) => ({
        kind: "item",
        label: i.label,
        href: i.href,
        icon: navIcons[i.icon],
      }));

    const result: { label: string; entries: GroupedEntry[] }[] = [];
    if (actions.length) result.push({ label: "Actions", entries: actions });
    if (nav.length) result.push({ label: "Go to", entries: nav });
    return result;
  }, [query, items, quickActions]);

  const flatEntries = useMemo(
    () => groups.flatMap((g) => g.entries),
    [groups],
  );

  const entryIndices = useMemo(() => {
    const map = new Map<GroupedEntry, number>();
    flatEntries.forEach((entry, i) => map.set(entry, i));
    return map;
  }, [flatEntries]);

  const selectedIndex = Math.min(active, Math.max(0, flatEntries.length - 1));

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, flatEntries.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const entry = flatEntries[selectedIndex];
        if (entry) {
          onClose();
          router.push(entry.href);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, selectedIndex, flatEntries, router, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-zinc-950/40 dark:bg-zinc-950/60"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl overflow-hidden rounded-lg border border-zinc-200 bg-surface shadow-2xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 dark:border-zinc-800">
              <Search className="size-4 shrink-0 text-zinc-400" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Search pages and actions…"
                aria-label="Search pages and actions"
                className="h-12 w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
              <kbd className="shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
                Esc
              </kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-1.5">
              {flatEntries.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  No results for “{query}”
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group.label} className="mb-1">
                    <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
                      {group.label}
                    </p>
                    {group.entries.map((entry) => {
                      const index = entryIndices.get(entry) ?? 0;
                      const selected = index === selectedIndex;
                      return (
                        <button
                          key={`${entry.kind}-${entry.label}`}
                          type="button"
                          onMouseMove={() => setActive(index)}
                          onClick={() => {
                            onClose();
                            router.push(entry.href);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                            selected
                              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                              : "text-zinc-700 dark:text-zinc-300",
                          )}
                        >
                          <span className="text-zinc-400 [&_svg]:size-4">
                            <entry.icon aria-hidden />
                          </span>
                          <span className="flex-1 truncate">{entry.label}</span>
                          {selected && (
                            <CornerDownLeft className="size-3.5 text-zinc-400" aria-hidden />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-1.5 text-[11px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
              <p>
                <kbd className="mr-0.5">↑</kbd>
                <kbd className="mr-2">↓</kbd> to navigate ·{" "}
                <kbd className="mr-0.5">↵</kbd> to open
              </p>
              <p className="hidden sm:block">{flatEntries.length} results</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
