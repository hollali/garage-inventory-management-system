"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { isNavActive, type NavItem } from "@/components/layout/nav";

export function SidebarSubmenu({
  id,
  item,
  open,
}: {
  id: string;
  item: NavItem;
  open: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.ul
          id={id}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          {item.children!.map((child) => {
            const search = child.search ?? "";
            const active = isNavActive(child, pathname) &&
              searchParams.toString() === search.replace(/^\?/, "");
            return (
              <li key={child.href + search}>
                <a
                  href={child.href + search}
                  data-nav-item
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative ml-[26px] flex items-center gap-2 border-l border-zinc-200 py-1.5 pl-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:border-zinc-800",
                    active
                      ? "text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -left-px top-1/2 h-3 w-px -translate-y-1/2 rounded-full transition-colors",
                      active
                        ? "bg-zinc-900 dark:bg-zinc-100"
                        : "bg-transparent",
                    )}
                  />
                  {child.label}
                </a>
              </li>
            );
          })}
        </motion.ul>
      )}
    </AnimatePresence>
  );
}
