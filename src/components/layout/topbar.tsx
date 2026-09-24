"use client";

import { usePathname } from "next/navigation";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { findActiveItem, type NavSection } from "@/components/layout/nav";

export function Topbar({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { setMobileOpen, mobileOpen, setCommandOpen } = useSidebar();
  const current = findActiveItem(sections, pathname);

  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl print:hidden sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          data-sidebar-menu-trigger
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls={mobileOpen ? "mobile-sidebar-nav" : undefined}
          className="-ml-1 rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <p className="truncate text-sm font-medium text-foreground">
            {current?.label ?? "Overview"}
          </p>
        </div>
        <p className="truncate text-sm font-medium text-foreground sm:hidden">
          {current?.label ?? "Overview"}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="hidden h-9 w-64 items-center justify-between gap-2 rounded-lg border border-border-strong bg-surface px-3 text-sm text-zinc-400 shadow-sm transition-colors hover:border-zinc-300 hover:text-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:flex dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
        >
          <span className="inline-flex items-center gap-2">
            <Search className="size-4" aria-hidden />
            Search…
          </span>
          <kbd className="rounded-md border border-border-strong bg-surface-strong px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="Search"
          className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
        >
          <Search className="size-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
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