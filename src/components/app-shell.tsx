"use client";

import { useMemo } from "react";
import { MotionConfig } from "framer-motion";
import {
  ArrowLeftRight,
  Briefcase,
  ClipboardList,
  Plus,
  ShoppingCart,
  Truck,
  Wrench,
} from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import {
  CommandMenu,
  type CommandAction,
} from "@/components/layout/command-menu";
import {
  flattenSections,
  navIcons,
  type NavItem,
  type NavSection,
} from "@/components/layout/nav";

export type { NavItem, NavSection };
export { navIcons };

type ShellProps = {
  brand: string;
  workspaceLabel?: string;
  userName: string;
  roleLabel: string;
  sections: NavSection[];
  quickActions?: CommandAction[];
  initiallyCollapsed?: boolean;
  children: React.ReactNode;
};

function buildDefaultActions(items: NavItem[]): CommandAction[] {
  const byLabel = (label: string) =>
    items.find((i) => i.label === label || i.label.includes(label));
  const actions: CommandAction[] = [];
  const inventory = byLabel("Inventory");
  if (inventory) {
    actions.push({
      label: "Add item",
      href: `${inventory.href}?modal=add`,
      hint: "New inventory entry",
      icon: Plus,
    });
  }
  const sales = byLabel("Sales");
  if (sales) {
    actions.push({
      label: "Record sale",
      href: `${sales.href}?modal=record`,
      hint: "Log an item sale",
      icon: ShoppingCart,
    });
  }
  const isAdminShell = !!byLabel("Purchase");
  const transfers = byLabel("Transfers");
  if (transfers && !isAdminShell) {
    actions.push({
      label: "Transfer stock",
      href: `${transfers.href}?modal=request`,
      hint: "Move items between shops",
      icon: ArrowLeftRight,
    });
  }
  const purchase = byLabel("Purchase");
  if (purchase) {
    actions.push({
      label: "New purchase order",
      href: `${purchase.href}?modal=new`,
      hint: "Order stock from a supplier",
      icon: ClipboardList,
    });
  }
  const workOrders = byLabel("Work order");
  if (workOrders && !isAdminShell) {
    actions.push({
      label: "Create work order",
      href: `${workOrders.href}?modal=new`,
      hint: "Open a job card",
      icon: Wrench,
    });
  }
  const shops = byLabel("Shops");
  if (shops) {
    actions.push({ label: "Add shop", href: `${shops.href}?modal=add`, icon: Briefcase });
  }
  const suppliers = byLabel("Supplier");
  if (suppliers) {
    actions.push({ label: "Add supplier", href: `${suppliers.href}?modal=add`, icon: Truck });
  }
  return actions;
}

export function AppShell({
  brand,
  workspaceLabel,
  userName,
  roleLabel,
  sections,
  quickActions,
  initiallyCollapsed,
  children,
}: ShellProps) {
  const items = useMemo(() => flattenSections(sections), [sections]);
  const defaultActions = useMemo(() => buildDefaultActions(items), [items]);

  return (
    <SidebarProvider sections={sections} initiallyCollapsed={initiallyCollapsed}>
      <ShellInner
        brand={brand}
        workspaceLabel={workspaceLabel}
        userName={userName}
        roleLabel={roleLabel}
        sections={sections}
        items={items}
        quickActions={quickActions ?? defaultActions}
      >
        {children}
      </ShellInner>
    </SidebarProvider>
  );
}

function ShellInner({
  brand,
  workspaceLabel,
  userName,
  roleLabel,
  sections,
  items,
  quickActions,
  children,
}: ShellProps & { items: NavItem[]; quickActions: CommandAction[] }) {
  const { commandOpen, setCommandOpen } = useSidebar();

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh bg-background">
        <Sidebar
          brand={brand}
          workspaceLabel={workspaceLabel}
          userName={userName}
          roleLabel={roleLabel}
          sections={sections}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar sections={sections} />

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
            {children}
          </main>
        </div>

        <CommandMenu
          open={commandOpen}
          onClose={() => setCommandOpen(false)}
          items={items}
          quickActions={quickActions}
        />

        <MobileSidebar
          brand={brand}
          workspaceLabel={workspaceLabel}
          userName={userName}
          roleLabel={roleLabel}
          sections={sections}
        />
      </div>
    </MotionConfig>
  );
}
