"use client";

import { usePathname } from "next/navigation";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { findActiveItem, type NavSection } from "@/components/layout/nav";

export function Topbar({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { setMobileOpen, setCommandOpen } = useSidebar();
  const current = findActiveItem(sections, pathname);

  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-surface/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          data-sidebar-menu-trigger
          aria-label="Open navigation menu"
          className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <p className="hidden text-sm font-medium text-zinc-400 sm:block dark:text-zinc-500">
          {current?.label ?? "Overview"}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="hidden h-8 w-56 items-center justify-between gap-2 rounded-md border border-zinc-200 bg-surface px-2.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 md:flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800"
        >
          <span className="inline-flex items-center gap-2">
            <Search className="size-3.5" aria-hidden />
            Search…
          </span>
          <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 font-mono text-[10px] font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="Search"
          className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Search className="size-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {theme === "dark" ? (
            <Sun className="size-4" aria-hidden />
          ) : (
            <Moon className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </header>
  );
}
