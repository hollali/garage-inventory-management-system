"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      return;
    }

    const onWaiting = (registration: ServiceWorkerRegistration) => {
      setWaiting(registration.waiting);
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        if (registration.waiting) {
          onWaiting(registration);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              onWaiting(registration);
            }
          });
        });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    register();
  }, []);

  async function reload() {
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  }

  return (
    <AnimatePresence>
      {waiting && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-surface p-3 shadow-lg lg:bottom-6 dark:border-zinc-800"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            <RefreshCw className="size-4 shrink-0 text-zinc-400" aria-hidden />
            A new version is available.
          </p>
          <Button type="button" onClick={reload} size="sm" className="shrink-0">
            Reload
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
