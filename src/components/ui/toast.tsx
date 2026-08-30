"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastItem = ToastInput & { id: number; variant: ToastVariant };

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "success" }: ToastInput) => {
      const id = ++nextIdRef.current;
      // Keep at most 4 visible; drop the oldest.
      setItems((prev) => [...prev.slice(-3), { id, title, description, variant }]);
      timersRef.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border bg-white p-3 shadow-lg dark:bg-zinc-900",
                item.variant === "success"
                  ? "border-emerald-200 dark:border-emerald-900"
                  : "border-rose-200 dark:border-rose-900",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0",
                  item.variant === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {item.variant === "success" ? (
                  <CheckCircle2 className="size-4" aria-hidden />
                ) : (
                  <TriangleAlert className="size-4" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="-m-1 shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
