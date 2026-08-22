"use client";

import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export type TooltipAnchor = { top: number; left: number };

export function SidebarTooltip({
  label,
  anchor,
}: {
  label: string;
  anchor: TooltipAnchor;
}) {
  return createPortal(
    <motion.span
      role="tooltip"
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{ top: anchor.top, left: anchor.left }}
      className="pointer-events-none fixed z-50 -translate-y-1/2"
    >
      <span className="block max-w-52 truncate rounded-md border border-zinc-200 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
        {label}
      </span>
    </motion.span>,
    document.body,
  );
}
