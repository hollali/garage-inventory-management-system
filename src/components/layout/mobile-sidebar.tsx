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
  userName,
  roleLabel,
  sections,
}: {
  brand: string;
  workspaceLabel?: string;
  userName: string;
  roleLabel: string;
  sections: NavSection[];
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
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-zinc-950/40 dark:bg-zinc-950/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Sidebar navigation"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-surface shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-center justify-between pr-2">
              <SidebarHeader brand={brand} collapsed={false} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {workspaceLabel && (
              <p className="truncate border-b border-zinc-200 px-4 py-2 text-[11px] font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <span className="text-muted">Workspace · </span>
                {workspaceLabel}
              </p>
            )}

            <SidebarNavigation sections={sections} collapsed={false} />

            <div className="shrink-0 border-t border-zinc-200 p-2 dark:border-zinc-800">
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
