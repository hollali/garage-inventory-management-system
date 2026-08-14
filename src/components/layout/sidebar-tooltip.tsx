"use client";

import { motion } from "framer-motion";

export function SidebarTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2">
      <motion.span
        role="tooltip"
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -4 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        className="block max-w-52 truncate rounded-md border border-zinc-200 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {label}
      </motion.span>
    </span>
  );
}
