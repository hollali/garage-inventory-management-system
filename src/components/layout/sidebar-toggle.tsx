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
        "rounded-md p-1.5 text-muted transition-colors hover:bg-surface-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <span className="relative flex size-4 items-center justify-center">
        <PanelLeftClose
          aria-hidden
          className={cn(
            "absolute transition-all duration-150 motion-reduce:transition-none",
            collapsed ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100",
          )}
        />
        <PanelLeftOpen
          aria-hidden
          className={cn(
            "absolute transition-all duration-150 motion-reduce:transition-none",
            collapsed ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
          )}
        />
      </span>
    </button>
  );
}
