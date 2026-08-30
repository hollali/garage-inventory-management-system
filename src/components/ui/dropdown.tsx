"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const DropdownContext = createContext<() => void>(() => {});

export function Dropdown({
  trigger,
  label,
  align = "end",
  direction = "down",
  menuClassName,
  buttonClassName,
  children,
}: {
  trigger: ReactNode;
  label?: string;
  align?: "start" | "end";
  direction?: "down" | "up";
  menuClassName?: string;
  buttonClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
          buttonClassName,
        )}
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, scale: 0.96, y: direction === "up" ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: direction === "up" ? 2 : -2 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-40 min-w-44 overflow-hidden rounded-md border border-zinc-200 bg-surface p-1 shadow-lg dark:border-zinc-800",
              direction === "up"
                ? "bottom-full mb-1"
                : "top-full mt-1",
              align === "end" ? "right-0" : "left-0",
              menuClassName,
            )}
          >
            <DropdownContext.Provider value={() => setOpen(false)}>
              {children}
            </DropdownContext.Provider>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  className,
  variant = "default",
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "danger";
  icon?: ReactNode;
}) {
  const close = useContext(DropdownContext);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        close();
        onClick?.();
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand",
        variant === "danger"
          ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
        className,
      )}
    >
      {icon && <span className="text-zinc-400 [&_svg]:size-4">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
      {children}
    </p>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />;
}
