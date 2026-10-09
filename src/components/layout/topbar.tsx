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
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl print:hidden sm:px-6 lg:px-9">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          data-sidebar-menu-trigger
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls={mobileOpen ? "mobile-sidebar-nav" : undefined}
          className="-ml-1 rounded-lg p-2 text-muted transition-colors hover:bg-surface-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
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
          className="hidden h-9 w-64 items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-muted shadow-sm transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:flex"
        >
          <span className="inline-flex items-center gap-2">
            <Search className="size-4" aria-hidden />
            Search…
          </span>
          <kbd className="rounded-md border border-border bg-surface-strong px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="Search"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
        >
          <Search className="size-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
