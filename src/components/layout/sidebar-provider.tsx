"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { isNavActive, type NavSection } from "@/components/layout/nav";

const STORAGE_KEY = "sidebar-collapsed";

type SidebarContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  ensureExpanded: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  openSubmenus: Set<string>;
  toggleSubmenu: (key: string) => void;
  openSubmenu: (key: string) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function submenuKeysForPath(sections: NavSection[], pathname: string): Set<string> {
  const open = new Set<string>();
  for (const section of sections) {
    for (const item of section.items) {
      if (item.children?.some((child) => isNavActive(child, pathname))) {
        open.add(item.href);
      }
    }
  }
  return open;
}

export function SidebarProvider({
  sections,
  initiallyCollapsed = false,
  children,
}: {
  sections: NavSection[];
  /** Read from the cookie on the server so the first paint has no collapse flash. */
  initiallyCollapsed?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const [mobileOpen, setMobileOpenState] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(
    () => submenuKeysForPath(sections, pathname),
  );
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpenState(false);
    setCommandOpen(false);
    const toOpen = submenuKeysForPath(sections, pathname);
    setOpenSubmenus((prev) => {
      let next = prev;
      for (const key of toOpen) {
        if (!next.has(key)) {
          if (next === prev) next = new Set(prev);
          next.add(key);
        }
      }
      return next;
    });
  }

  useEffect(() => {
    document.cookie = `${STORAGE_KEY}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }, [collapsed]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const setMobileOpen = useCallback((open: boolean) => setMobileOpenState(open), []);
  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
  const ensureExpanded = useCallback(
    () => setCollapsed((c) => (c ? false : c)),
    [],
  );

  const toggleSubmenu = useCallback((key: string) => {
    setOpenSubmenus((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const openSubmenu = useCallback((key: string) => {
    setOpenSubmenus((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({
      collapsed,
      toggleCollapsed,
      ensureExpanded,
      mobileOpen,
      setMobileOpen,
      commandOpen,
      setCommandOpen,
      openSubmenus,
      toggleSubmenu,
      openSubmenu,
    }),
    [
      collapsed,
      toggleCollapsed,
      ensureExpanded,
      mobileOpen,
      setMobileOpen,
      commandOpen,
      openSubmenus,
      toggleSubmenu,
      openSubmenu,
    ],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
