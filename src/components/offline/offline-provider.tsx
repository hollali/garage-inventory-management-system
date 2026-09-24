"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  describeOp,
  getPendingOps,
  subscribeQueue,
  updateOp,
  removeOp,
  enqueueOp,
  type QueuedOp,
} from "@/lib/offline/queue";
import { runQueuedOp } from "@/lib/offline/dispatch";

type OfflineContextValue = {
  isOnline: boolean;
  pendingCount: number;
  enqueue: (type: string, data: Record<string, unknown>) => QueuedOp;
  syncNow: () => Promise<boolean>;
  syncing: boolean;
  lastSyncError: string | null;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(() => getPendingOps().length);
  const [syncing, setSyncing] = useState(false);
  const [syncedToast, setSyncedToast] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(() => setPendingCount(getPendingOps().length), []);

  useEffect(() => subscribeQueue(refreshCount), [refreshCount]);

  const syncNow = useCallback(async () => {
    if (syncingRef.current || typeof navigator === "undefined" || !navigator.onLine) {
      return false;
    }
    const ops = getPendingOps();
    if (ops.length === 0) return true;

    syncingRef.current = true;
    setSyncing(true);
    setLastSyncError(null);

    let done = 0;
    let failed = 0;
    for (const op of ops) {
      const result = await runQueuedOp(op);
      if (result?.ok) {
        removeOp(op.id);
        done += 1;
      } else {
        updateOp(op.id, {
          attempts: op.attempts + 1,
          lastError: result?.error,
        });
        failed += 1;
      }
    }

    syncingRef.current = false;
    setSyncing(false);
    setPendingCount(getPendingOps().length);

    if (failed === 0 && done > 0) {
      setSyncedToast(
        done === 1 ? "Offline action sent." : `${done} offline actions sent.`,
      );
      router.refresh();
    } else if (failed > 0) {
      setLastSyncError("Some offline actions could not be sent.");
    }
    return failed === 0;
  }, [router]);

  useEffect(() => {
    const update = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) syncNow();
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [syncNow]);

  const enqueue = useCallback(
    (type: string, data: Record<string, unknown>) => {
      const op = enqueueOp({ type, data });
      setPendingCount(getPendingOps().length);
      if (!navigator.onLine) {
        toast({
          title: "Saved while offline",
          description: "It will be sent automatically when you reconnect.",
        });
      }
      return op;
    },
    [toast],
  );

  const clearSynced = useCallback(() => setSyncedToast(null), []);

  const value = useMemo<OfflineContextValue>(
    () => ({ isOnline, pendingCount, enqueue, syncNow, syncing, lastSyncError }),
    [isOnline, pendingCount, enqueue, syncNow, syncing, lastSyncError],
  );

  return (
    <OfflineContext.Provider value={value}>
      {children}
      {!isOnline && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-14 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 shadow-lg lg:bottom-4 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <CloudOff className="size-3.5 shrink-0" aria-hidden />
          Offline
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {pendingCount} pending
            </span>
          )}
        </div>
      )}
      {syncedToast && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-14 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-lg lg:bottom-4 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          <RefreshCw className="size-3.5 shrink-0" aria-hidden />
          {syncedToast}
          <button
            type="button"
            onClick={clearSynced}
            aria-label="Dismiss"
            className="ml-1 rounded-full p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
          >
            <X className="size-3" aria-hidden />
          </button>
        </div>
      )}
      {pendingCount > 0 && isOnline && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-14 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 shadow-lg lg:bottom-4 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
        >
          <RefreshCw className="size-3.5 shrink-0" aria-hidden />
          {pendingCount} offline action{pendingCount === 1 ? "" : "s"} pending
          {lastSyncError && <span className="text-rose-600 dark:text-rose-400">· {lastSyncError}</span>}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-5 rounded-full px-2 text-[10px]"
            onClick={() => syncNow()}
            loading={syncing}
          >
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      )}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}

export { describeOp };