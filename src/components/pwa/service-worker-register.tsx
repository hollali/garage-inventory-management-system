"use client";

import { useEffect, useState } from "react";
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
    <>
      {waiting && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg lg:bottom-6"
        >
          <p className="text-sm font-medium text-slate-700">
            A new version is available.
          </p>
          <Button type="button" onClick={reload} className="shrink-0">
            Reload
          </Button>
        </div>
      )}
    </>
  );
}
