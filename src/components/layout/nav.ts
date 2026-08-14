import {
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  ClipboardList,
  Home,
  LayoutGrid,
  List,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const navIcons: Record<string, LucideIcon> = {
  dashboard: LayoutGrid,
  home: Home,
  inventory: Package,
  sales: ShoppingCart,
  shops: Briefcase,
  attendants: Users,
  activity: List,
  transfer: ArrowLeftRight,
  supplier: Truck,
  purchaseOrder: ClipboardList,
  workOrder: Wrench,
  reports: BarChart3,
  settings: Settings,
};

export type NavChildItem = {
  href: string;
  label: string;
  /** Optional query string, e.g. "?type=low". Active-state matching compares pathname + search. */
  search?: string;
  exact?: boolean;
};

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof navIcons;
  exact?: boolean;
  badge?: string | number;
  children?: NavChildItem[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export function isNavActive(
  item: { href: string; exact?: boolean },
  pathname: string,
) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function flattenSections(sections: NavSection[]): NavItem[] {
  return sections.flatMap((section) => section.items);
}

export function findActiveItem(
  sections: NavSection[],
  pathname: string,
): NavItem | null {
  for (const section of sections) {
    for (const item of section.items) {
      if (isNavActive(item, pathname)) return item;
    }
  }
  return null;
}

/**
 * Subtle, per-icon hover micro-interactions (Tailwind group-hover utilities).
 * Keyed by nav icon name; falls back to a gentle scale.
 */
export const iconHoverClasses: Record<string, string> = {
  dashboard: "group-hover:scale-110",
  settings: "group-hover:rotate-12",
  reports: "group-hover:-translate-y-0.5",
  transfer: "group-hover:translate-x-0.5",
};
