import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/dal";
import { AppShell, type NavSection } from "@/components/app-shell";

const navSections: NavSection[] = [
  {
    label: "Main",
    items: [
      { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        href: "/admin/inventory",
        label: "Inventory",
        icon: "inventory",
        children: [
          { href: "/admin/inventory", label: "All items", exact: true },
          { href: "/admin/inventory", label: "Low stock", search: "?type=low", exact: true },
          { href: "/admin/inventory", label: "Out of stock", search: "?type=out", exact: true },
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/purchase-orders", label: "Purchase orders", icon: "purchaseOrder" },
      { href: "/admin/suppliers", label: "Suppliers", icon: "supplier" },
      { href: "/admin/transfers", label: "Transfers", icon: "transfer" },
      { href: "/admin/work-orders", label: "Work orders", icon: "workOrder" },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/admin/shops", label: "Shops", icon: "shops" },
      { href: "/admin/attendants", label: "Attendants", icon: "attendants" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/admin/reports", label: "Reports", icon: "reports" },
      { href: "/admin/activity", label: "Activity log", icon: "activity" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: "settings" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, cookieStore] = await Promise.all([requireAdmin(), cookies()]);
  const initiallyCollapsed = cookieStore.get("sidebar-collapsed")?.value === "1";

  return (
    <AppShell
      brand="Garage Inventory"
      workspaceLabel="Administrator"
      userName={user.name ?? ""}
      roleLabel="Admin"
      sections={navSections}
      initiallyCollapsed={initiallyCollapsed}
    >
      {children}
    </AppShell>
  );
}
