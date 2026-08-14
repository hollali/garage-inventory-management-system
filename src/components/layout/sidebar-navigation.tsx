"use client";

import { cn } from "@/lib/utils";
import type { NavSection } from "@/components/layout/nav";
import { SidebarItem } from "@/components/layout/sidebar-item";

export function SidebarNavigation({
  sections,
  collapsed,
}: {
  sections: NavSection[];
  collapsed: boolean;
}) {
  return (
    <nav aria-label="Sidebar" className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
      <ul className="flex flex-col gap-4">
        {sections.map((section) => (
          <SidebarSection key={section.label} section={section} collapsed={collapsed} />
        ))}
      </ul>
    </nav>
  );
}

function SidebarSection({
  section,
  collapsed,
}: {
  section: NavSection;
  collapsed: boolean;
}) {
  return (
    <li>
      <p
        className={cn(
          "px-2.5 pb-1.5 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase dark:text-zinc-500",
          collapsed && "sr-only",
        )}
      >
        {section.label}
      </p>
      <ul className="flex flex-col gap-0.5">
        {section.items.map((item) => (
          <SidebarItem key={item.href} item={item} collapsed={collapsed} />
        ))}
      </ul>
    </li>
  );
}
