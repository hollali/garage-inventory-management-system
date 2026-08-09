import { requireAdmin } from "@/lib/dal";
import { AppShell, type NavItem } from "@/components/app-shell";

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/admin/inventory", label: "Inventory", icon: "inventory" },
  { href: "/admin/transfers", label: "Transfers", icon: "transfer" },
  { href: "/admin/suppliers", label: "Suppliers", icon: "supplier" },
  { href: "/admin/purchase-orders", label: "Purchase orders", icon: "purchaseOrder" },
  { href: "/admin/work-orders", label: "Work orders", icon: "workOrder" },
  { href: "/admin/shops", label: "Shops", icon: "shops" },
  { href: "/admin/attendants", label: "Attendants", icon: "attendants" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
  { href: "/admin/activity", label: "Activity log", icon: "activity" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <AppShell
      brand="Garage Inventory"
      userName={user.name ?? ""}
      roleLabel="Admin"
      items={navItems}
    >
      {children}
    </AppShell>
  );
}
