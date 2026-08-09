import { requireAttendant } from "@/lib/dal";
import { AppShell, type NavItem } from "@/components/app-shell";

const navItems: NavItem[] = [
  { href: "/shop", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/shop/items", label: "Inventory", icon: "inventory" },
  { href: "/shop/sales", label: "Sales", icon: "sales" },
  { href: "/shop/transfers", label: "Transfers", icon: "transfer" },
  { href: "/shop/work-orders", label: "Work orders", icon: "workOrder" },
];

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAttendant();

  return (
    <AppShell
      brand="Garage Inventory"
      userName={user.name ?? ""}
      roleLabel="Shop Attendant"
      items={navItems}
    >
      {children}
    </AppShell>
  );
}
