"use client";

import { motion } from "framer-motion";
import { useSidebar } from "@/components/layout/sidebar-provider";
import type { NavSection } from "@/components/layout/nav";
import { SidebarHeader, BrandMark } from "@/components/layout/sidebar-header";
import { SidebarNavigation } from "@/components/layout/sidebar-navigation";
import { SidebarUser } from "@/components/layout/sidebar-user";
import { SidebarToggle } from "@/components/layout/sidebar-toggle";

export { BrandMark };

export function Sidebar({
  brand,
  workspaceLabel,
  userName,
  roleLabel,
  sections,
}: {
  brand: string;
  workspaceLabel?: string;
  userName: string;
  roleLabel: string;
  sections: NavSection[];
}) {
  const { collapsed } = useSidebar();

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="sticky top-0 z-30 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-surface dark:border-zinc-800 dark:bg-zinc-950 lg:flex"
    >
      <SidebarHeader
        brand={brand}
        collapsed={collapsed}
        action={<SidebarToggle />}
      />
      <SidebarNavigation sections={sections} collapsed={collapsed} />

      <div className="shrink-0 space-y-1 border-t border-zinc-200 px-2 py-2 dark:border-zinc-800">
        {!collapsed && workspaceLabel && (
          <p
            title={workspaceLabel}
            className="truncate rounded-md px-3 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
          >
            <span className="text-muted">Workspace · </span>
            {workspaceLabel}
          </p>
        )}
        <SidebarUser
          userName={userName}
          roleLabel={roleLabel}
          sections={sections}
          collapsed={collapsed}
        />
      </div>
    </motion.aside>
  );
}
