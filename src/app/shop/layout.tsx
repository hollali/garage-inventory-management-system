import { requireAttendant, getShopForAttendant } from "@/lib/dal";
import { AppShell, type NavSection } from "@/components/app-shell";

const navSections: NavSection[] = [
  {
    label: "Main",
    items: [
      { href: "/shop", label: "Dashboard", icon: "dashboard", exact: true },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/shop/items", label: "Inventory", icon: "inventory" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/shop/sales", label: "Sales", icon: "sales" },
      { href: "/shop/transfers", label: "Transfers", icon: "transfer" },
      { href: "/shop/work-orders", label: "Work orders", icon: "workOrder" },
    ],
  },
];

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAttendant();
  const shop = await getShopForAttendant(user.id);

  return (
    <AppShell
      brand="Garage Inventory"
      workspaceLabel={shop?.name ?? "Unassigned shop"}
      userName={user.name ?? ""}
      roleLabel="Shop Attendant"
      sections={navSections}
    >
      {children}
    </AppShell>
  );
}
