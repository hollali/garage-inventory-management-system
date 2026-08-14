"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-provider";

export function SidebarToggle({ className }: { className?: string }) {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={cn(
        "rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
        className,
      )}
    >
      <span className="relative flex size-4 items-center justify-center">
        <PanelLeftClose
          aria-hidden
          className={cn(
            "absolute transition-all duration-150",
            collapsed ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100",
          )}
        />
        <PanelLeftOpen
          aria-hidden
          className={cn(
            "absolute transition-all duration-150",
            collapsed ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
          )}
        />
      </span>
    </button>
  );
}
