"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiGrid,
  FiHome,
  FiPackage,
  FiShoppingCart,
  FiBriefcase,
  FiUsers,
  FiList,
  FiMenu,
  FiX,
  FiRepeat,
  FiTruck,
  FiClipboard,
  FiTool,
  FiBarChart2,
  FiSettings,
} from "react-icons/fi";
import { FaWrench } from "react-icons/fa";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof navIcons;
  exact?: boolean;
};

export const navIcons: Record<string, IconType> = {
  dashboard: FiGrid,
  home: FiHome,
  inventory: FiPackage,
  sales: FiShoppingCart,
  shops: FiBriefcase,
  attendants: FiUsers,
  activity: FiList,
  transfer: FiRepeat,
  supplier: FiTruck,
  purchaseOrder: FiClipboard,
  workOrder: FiTool,
  reports: FiBarChart2,
  settings: FiSettings,
};

type ShellProps = {
  brand: string;
  userName: string;
  roleLabel: string;
  items: NavItem[];
  children: React.ReactNode;
};

type SidebarProps = Omit<ShellProps, "children">;

function BrandMark({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-indigo-400 text-white shadow-sm",
        size === "sm" ? "size-7 rounded-md" : "size-8",
      )}
    >
      <FaWrench className={cn("animate-wiggle", size === "sm" ? "size-3.5" : "size-4")} aria-hidden />
    </div>
  );
}

function MobileSidebar({ brand, userName, roleLabel, items }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const renderIcon = (item: NavItem, className: string) => {
    const Icon = navIcons[item.icon] ?? FiGrid;
    return <Icon className={className} aria-hidden />;
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            aria-controls="app-sidebar"
            className="-ml-2 rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100"
          >
            <FiMenu className="size-5" aria-hidden />
          </button>
          <BrandMark />
          <span className="text-sm font-semibold">{brand}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="hidden sm:inline">{userName}</span>
          <LogoutButton className="rounded-md px-2 py-1 text-xs text-muted hover:bg-slate-100" />
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Sidebar navigation"
        inert={!open}
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform duration-200 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-2.5">
            <BrandMark size="md" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">{brand}</p>
              <p className="text-[11px] text-slate-400">Inventory management</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <FiX className="size-5" aria-hidden />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "text-base transition-transform duration-200",
                    !active && "group-hover:scale-110",
                  )}
                >
                  {renderIcon(item, "size-4")}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-indigo-400 text-sm font-semibold text-white">
              {userName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="text-[11px] capitalize text-slate-400">{roleLabel}</p>
            </div>
            <LogoutButton className="rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" />
          </div>
        </div>
      </aside>
    </>
  );
}

export function AppShell({ brand, userName, roleLabel, items, children }: ShellProps) {
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const renderIcon = (item: NavItem, className: string) => {
    const Icon = navIcons[item.icon] ?? FiGrid;
    return <Icon className={className} aria-hidden />;
  };

  return (
    <div className="min-h-dvh bg-background">
      <aside
        aria-label="Sidebar navigation"
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 text-slate-300 lg:flex"
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-5">
          <BrandMark size="md" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">{brand}</p>
            <p className="text-[11px] text-slate-400">Inventory management</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "text-base transition-transform duration-200",
                    !active && "group-hover:scale-110",
                  )}
                >
                  {renderIcon(item, "size-4")}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-indigo-400 text-sm font-semibold text-white">
              {userName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="text-[11px] capitalize text-slate-400">{roleLabel}</p>
            </div>
            <LogoutButton className="rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" />
          </div>
        </div>
      </aside>

      <MobileSidebar
        key={pathname}
        brand={brand}
        userName={userName}
        roleLabel={roleLabel}
        items={items}
      />

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          {children}
        </div>
      </main>

      <nav
        aria-label="Bottom navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {items.slice(0, 5).map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
                active ? "text-brand" : "text-slate-500",
              )}
            >
              <span className="text-lg leading-none">
                {renderIcon(item, cn("size-5", active && "animate-pulse-glow"))}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
