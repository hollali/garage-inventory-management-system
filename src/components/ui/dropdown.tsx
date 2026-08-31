"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const DropdownContext = createContext<() => void>(() => {});

type DropdownProps = {
  trigger: ReactNode;
  label?: string;
  align?: "start" | "end";
  direction?: "down" | "up";
  menuClassName?: string;
  buttonClassName?: string;
  children: ReactNode;
};

export function Dropdown({
  trigger,
  label,
  align = "end",
  direction = "down",
  menuClassName,
  buttonClassName,
  children,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const measure = () => {
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
  };

  useLayoutEffect(() => {
    if (open) measure();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onReposition() {
      measure();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    document.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      document.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const menu = open && rect ? (
    <DropdownMenu
      rect={rect}
      align={align}
      direction={direction}
      menuClassName={menuClassName}
      menuId={menuId}
      label={label}
      menuRef={menuRef}
      onClose={() => {
        setOpen(false);
        triggerRef.current?.focus();
      }}
    >
      {children}
    </DropdownMenu>
  ) : null;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setOpen((o) => {
            if (!o) measure();
            return !o;
          });
        }}
        className={cn(
          "inline-flex items-center rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
          buttonClassName,
        )}
      >
        {trigger}
      </button>
      {menu}
    </div>
  );
}

function DropdownMenu({
  rect,
  align,
  direction,
  menuClassName,
  menuId,
  label,
  menuRef,
  onClose,
  children,
}: {
  rect: DOMRect;
  align: "start" | "end";
  direction: "down" | "up";
  menuClassName?: string;
  menuId: string;
  label?: string;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const [styles, setStyles] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    const menuEl = menuRef.current;
    if (!menuEl) return;

    const menuRect = menuEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 4;

    let top =
      direction === "up"
        ? rect.top - menuRect.height - margin
        : rect.bottom + margin;

    if (top < margin) top = rect.bottom + margin;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    if (direction === "up" && top < margin && spaceBelow >= menuRect.height + margin * 2) {
      top = rect.bottom + margin;
    } else if (direction === "down" && top + menuRect.height > vh - margin && spaceAbove >= menuRect.height + margin * 2) {
      top = rect.top - menuRect.height - margin;
    }

    const left =
      align === "end"
        ? Math.max(margin, Math.min(rect.right - menuRect.width, vw - menuRect.width - margin))
        : Math.max(margin, Math.min(rect.left, vw - menuRect.width - margin));

    setStyles({ top, left });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect, align, direction, menuId]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={label}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: "fixed", ...styles }}
        className={cn(
          "z-[60] w-max min-w-44 overflow-hidden rounded-md border border-zinc-200 bg-surface p-1 shadow-lg dark:border-zinc-800",
          menuClassName,
        )}
      >
        <DropdownContext.Provider value={onClose}>{children}</DropdownContext.Provider>
      </motion.div>
    </AnimatePresence>,
    document.body,
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
