export type QueuedOp = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

const STORAGE_KEY = "gims.offline.queue.v1";

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingOps(): QueuedOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOps(ops: QueuedOp[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  } catch {
    // Storage may be unavailable (private mode / quota). Best effort.
  }
  notify();
}

export function enqueueOp(partial: Omit<QueuedOp, "id" | "createdAt" | "attempts">): QueuedOp {
  const op: QueuedOp = {
    ...partial,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    attempts: 0,
  };
  saveOps([...getPendingOps(), op]);
  return op;
}

export function updateOp(id: string, patch: Partial<QueuedOp>) {
  saveOps(getPendingOps().map((op) => (op.id === id ? { ...op, ...patch } : op)));
}

export function removeOp(id: string) {
  saveOps(getPendingOps().filter((op) => op.id !== id));
}

export function clearQueue() {
  saveOps([]);
}

/** Serialize a FormData object into a plain, storable structure. */
export function formDataToRecord(formData: FormData): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const value = formData.getAll(key);
    record[key] = value.length === 1 ? value[0] : value;
  }
  return record;
}

/** Rebuild a FormData from a queued op's serialized data. */
export function recordToFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      for (const item of value) formData.append(key, String(item));
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }
  return formData;
}

/** Format the queued ops into a short human-readable description. */
export function describeOp(op: QueuedOp): string {
  switch (op.type) {
    case "createSale":
      return "Recorded sale";
    case "createWorkOrder":
      return "New work order";
    case "updateWorkOrder":
      return "Work order update";
    case "addWorkOrderPart":
      return "Added work-order part";
    case "removeWorkOrderPart":
      return "Removed work-order part";
    case "setWorkOrderStatus":
      return "Work order status change";
    case "requestTransfer":
      return "Transfer request";
    default:
      return "Action";
  }
}