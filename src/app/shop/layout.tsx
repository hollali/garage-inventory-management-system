import { cookies } from "next/headers";
import { requireAttendant, getAttendantShops, getShopForAttendant } from "@/lib/dal";
import { getSiteSettings } from "@/lib/queries/settings";
import { AppShell, type NavSection } from "@/components/app-shell";
import { ActiveShopSelector } from "@/components/shops/active-shop-selector";

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
  const [user, cookieStore, settings] = await Promise.all([
    requireAttendant(),
    cookies(),
    getSiteSettings(),
  ]);
  const [assignedShops, shop] = await Promise.all([
    getAttendantShops(user.id),
    getShopForAttendant(user.id),
  ]);
  const initiallyCollapsed = cookieStore.get("sidebar-collapsed")?.value === "1";

  return (
    <AppShell
      brand={settings.brandName}
      logoUrl={settings.logoUrl}
      workspaceLabel={shop?.name ?? "Unassigned shop"}
      workspaceSwitcher={
        <ActiveShopSelector
          shops={assignedShops.map((s) => ({ id: s.id, name: s.name }))}
          activeShopId={shop?.id ?? assignedShops[0]?.id ?? null}
        />
      }
      userName={user.name ?? ""}
      roleLabel="Shop Attendant"
      sections={navSections}
      initiallyCollapsed={initiallyCollapsed}
    >
      {children}
    </AppShell>
  );
}
