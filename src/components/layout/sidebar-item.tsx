"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  iconHoverClasses,
  isNavActive,
  navIcons,
  type NavItem,
} from "@/components/layout/nav";
import { useSidebar } from "@/components/layout/sidebar-provider";
import {
  SidebarTooltip,
  type TooltipAnchor,
} from "@/components/layout/sidebar-tooltip";
import { SidebarSubmenu } from "@/components/layout/sidebar-submenu";

function useCollapsedTooltip() {
  const [anchor, setAnchor] = useState<TooltipAnchor | null>(null);
  const show = (el: HTMLElement | null) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ top: r.top + r.height / 2, left: r.right + 8 });
  };
  const hide = () => setAnchor(null);
  return { anchor, show, hide };
}

export function SidebarItem({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const submenuId = useId();
  const itemRef = useRef<HTMLLIElement>(null);
  const { openSubmenus, toggleSubmenu, ensureExpanded, openSubmenu } =
    useSidebar();
  const tooltip = useCollapsedTooltip();

  const Icon = navIcons[item.icon];
  const hasChildren = !!item.children?.length;
  const open = hasChildren && openSubmenus.has(item.href);
  const active = isNavActive(item, pathname);

  const rowClass = cn(
    "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    collapsed && "justify-center px-0",
    active
      ? "text-zinc-900 dark:text-zinc-100"
      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
  );

  const iconClass = cn(
    "size-[18px] shrink-0 transition-transform duration-200",
    iconHoverClasses[item.icon] ?? "group-hover:scale-105",
  );

  const hoverProps = {
    onMouseEnter: () => tooltip.show(itemRef.current),
    onMouseLeave: tooltip.hide,
    onFocus: () => tooltip.show(itemRef.current),
    onBlur: tooltip.hide,
  };

  function closeOnEscape(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      toggleSubmenu(item.href);
      e.currentTarget.focus();
    }
  }

  const icon = <Icon className={iconClass} aria-hidden />;

  const label = !collapsed && <span className="truncate">{item.label}</span>;

  const badge = !collapsed && item.badge != null && (
    <span className="ml-auto shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 tabular-nums dark:bg-zinc-800 dark:text-zinc-300">
      {item.badge}
    </span>
  );

  const tooltipPortal = collapsed && tooltip.anchor && (
    <SidebarTooltip label={item.label} anchor={tooltip.anchor} />
  );

  // Collapsed + parent with children: expand the sidebar and reveal the submenu.
  if (hasChildren && collapsed) {
    return (
      <li ref={itemRef} className="relative" {...hoverProps}>
        <button
          type="button"
          data-nav-item
          onClick={() => {
            ensureExpanded();
            openSubmenu(item.href);
          }}
          aria-label={item.label}
          className={rowClass}
        >
          {icon}
        </button>
        {tooltipPortal}
      </li>
    );
  }

  if (hasChildren) {
    return (
      <li className="relative">
        {active && (
          <motion.span
            layoutId="sidebar-active-nav"
            aria-hidden
            className="absolute inset-0 rounded-md bg-zinc-100 dark:bg-zinc-800"
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
          />
        )}
        <div className="relative flex items-center">
          <Link
            href={item.href}
            data-nav-item
            aria-current={active ? "page" : undefined}
            className={cn(rowClass, "flex-1")}
          >
            {icon}
            {label}
          </Link>
          <button
            type="button"
            onClick={() => toggleSubmenu(item.href)}
            onKeyDown={closeOnEscape}
            aria-expanded={open}
            aria-controls={open ? submenuId : undefined}
            aria-label={`${open ? "Collapse" : "Expand"} ${item.label} submenu`}
            className="mr-1.5 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ChevronRight
              aria-hidden
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-90",
              )}
            />
          </button>
        </div>
        <SidebarSubmenu id={submenuId} item={item} open={open} />
      </li>
    );
  }

  return (
    <li ref={itemRef} className="relative" {...hoverProps}>
      {active && (
        <motion.span
          layoutId="sidebar-active-nav"
          aria-hidden
          className="absolute inset-0 rounded-md bg-zinc-100 dark:bg-zinc-800"
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        />
      )}
      <Link
        href={item.href}
        data-nav-item
        aria-current={active ? "page" : undefined}
        className={rowClass}
      >
        {icon}
        {label}
        {badge}
      </Link>
      {tooltipPortal}
    </li>
  );
}
