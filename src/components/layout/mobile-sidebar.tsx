"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useSidebar } from "@/components/layout/sidebar-provider";
import type { NavSection } from "@/components/layout/nav";
import { SidebarHeader } from "@/components/layout/sidebar-header";
import { SidebarNavigation } from "@/components/layout/sidebar-navigation";
import { SidebarUser } from "@/components/layout/sidebar-user";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileSidebar({
  brand,
  workspaceLabel,
  workspaceSwitcher,
  userName,
  roleLabel,
  sections,
  logoUrl,
}: {
  brand: string;
  workspaceLabel?: string;
  workspaceSwitcher?: React.ReactNode;
  userName: string;
  roleLabel: string;
  sections: NavSection[];
  logoUrl?: string | null;
}) {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    const id = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(FOCUSABLE)
        ?.focus();
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [mobileOpen, setMobileOpen]);

  return (
    <AnimatePresence>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 print:hidden lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm dark:bg-zinc-950/70"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <motion.aside
            ref={panelRef}
            id="mobile-sidebar-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Sidebar navigation"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-modal"
          >
            <div className="flex items-center justify-between">
              <SidebarHeader
                brand={brand}
                collapsed={false}
                logoUrl={logoUrl}
                action={
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close navigation menu"
                    className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                }
              />
            </div>

            {workspaceSwitcher ? (
              <div className="border-b border-border px-3 py-2">
                {workspaceSwitcher}
              </div>
            ) : workspaceLabel ? (
              <p className="truncate border-b border-border px-4 py-2 text-[11px] font-medium text-muted">
                Workspace · {workspaceLabel}
              </p>
            ) : null}

            <SidebarNavigation sections={sections} collapsed={false} />

            <div className="shrink-0 border-t border-border p-2">
              <SidebarUser
                userName={userName}
                roleLabel={roleLabel}
                sections={sections}
                collapsed={false}
              />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
