"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Split,
  User2,
  WifiOff,
  X,
} from "lucide-react";
import { createSale } from "@/lib/actions/sales";
import { formatMoney } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useOffline } from "@/components/offline/offline-provider";
import { formDataToRecord } from "@/lib/offline/queue";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";
import { Badge } from "@/components/ui/badge";
import { BarcodeScanner } from "@/components/inventory/barcode-scanner";
import { Numpad, applyKey } from "@/components/sales/numpad";
import { cn } from "@/lib/utils";

type PosItem = {
  id: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  imageUrl: string | null;
  unitName: string;
  unitPriceCents: number;
  available: number;
};

type PosCustomer = { id: string; name: string; contact: string; vehicleReg: string };

type CartLine = { itemId: string; qty: number };

type PaymentLeg = { id: string; method: "cash" | "card" | "mobile"; amount: string };

const METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "mobile", label: "Mobile money", icon: Smartphone },
] as const;

type Method = (typeof METHODS)[number]["value"];

function centsOf(text: string): number {
  const n = Number.parseFloat(text);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function legAmountsText(legs: PaymentLeg[]): number {
  return legs.reduce((sum, leg) => sum + centsOf(leg.amount), 0);
}

function nextLegId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function PosRegister({
  shopName,
  items,
  categories,
  recentCustomers,
}: {
  shopName: string;
  items: PosItem[];
  categories: string[];
  recentCustomers: PosCustomer[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { isOnline, enqueue } = useOffline();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discountText, setDiscountText] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [singleMethod, setSingleMethod] = useState<Method>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [splitMode, setSplitMode] = useState(false);
  const [splitLegs, setSplitLegs] = useState<PaymentLeg[]>([]);
  const [activeSplitLegId, setActiveSplitLegId] = useState<string | null>(null);
  const [showKeypad, setShowKeypad] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    totalCents: number;
    changeCents: number;
    queued: boolean;
  } | null>(null);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "All" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.barcode.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, query, category]);

  const availableByItem = useMemo(() => new Map(items.map((i) => [i.id, i.available])), [items]);

  const cartLines = useMemo(
    () =>
      lines
        .map((line) => {
          const item = itemById.get(line.itemId);
          return item ? { item, qty: line.qty, lineCents: item.unitPriceCents * line.qty } : null;
        })
        .filter((l): l is NonNullable<typeof l> => l !== null),
    [lines, itemById],
  );

  const subtotalCents = cartLines.reduce((sum, line) => sum + line.lineCents, 0);
  const discountCents = Math.min(centsOf(discountText), subtotalCents);
  const totalCents = Math.max(0, subtotalCents - discountCents);

  const splitPaidCents = legAmountsText(splitLegs);
  const splitRemainingCents = totalCents - splitPaidCents;

  const cashChangeCents =
    !splitMode && singleMethod === "cash" ? Math.max(0, centsOf(cashReceived) - totalCents) : 0;

  function addItem(itemId: string, qty = 1) {
    const item = itemById.get(itemId);
    if (!item || item.available <= 0) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === itemId);
      const nextQty = Math.min(item.available, (existing?.qty ?? 0) + qty);
      if (existing) {
        return prev.map((l) => (l.itemId === itemId ? { ...l, qty: nextQty } : l));
      }
      return [...prev, { itemId, qty: 1 }];
    });
    setSuccess(null);
  }

  function updateQty(itemId: string, qty: number) {
    const item = itemById.get(itemId);
    const clamped = item ? Math.min(Math.max(1, qty), item.available) : Math.max(1, qty);
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, qty: clamped } : l)));
  }

  function removeLine(itemId: string) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  function handleSearchEnter() {
    const q = query.trim();
    if (!q) return;
    const lower = q.toLowerCase();
    const exact = items.find(
      (i) =>
        i.barcode.toLowerCase() === lower ||
        (i.sku && i.sku.toLowerCase() === lower),
    );
    if (exact) {
      addItem(exact.id);
      setQuery("");
      return;
    }
    const nameMatches = items.filter((i) => i.name.toLowerCase().includes(lower));
    if (nameMatches.length === 1) {
      addItem(nameMatches[0].id);
      setQuery("");
      return;
    }
    if (nameMatches.length === 0) {
      toast({ title: `No item matches "${q}"`, variant: "error" });
    }
  }

  function addCashBalanceLeg() {
    if (splitRemainingCents <= 0) return;
    const existing = splitLegs.find((l) => l.method === "cash");
    if (existing) {
      setSplitLegs((prev) =>
        prev.map((l) =>
          l.id === existing.id ? { ...l, amount: (splitRemainingCents / 100).toFixed(2) } : l,
        ),
      );
    } else {
      setSplitLegs((prev) => [
        ...prev,
        { id: nextLegId(), method: "cash", amount: (splitRemainingCents / 100).toFixed(2) },
      ]);
    }
  }

  function buildBreakdown(): { method: Method; amountCents: number }[] {
    if (splitMode) {
      return splitLegs.map((leg) => ({ method: leg.method, amountCents: centsOf(leg.amount) }));
    }
    return [{ method: singleMethod, amountCents: totalCents }];
  }

  const paymentReady =
    totalCents > 0 &&
    (splitMode
      ? splitLegs.length > 0 && splitLegs.every((l) => centsOf(l.amount) > 0) && splitPaidCents === totalCents
      : singleMethod === "cash"
        ? centsOf(cashReceived) >= totalCents
        : true);

  async function completeSale() {
    if (!paymentReady || lines.length === 0) return;

    const formData = new FormData();
    formData.set("lines", JSON.stringify(lines.map((l) => ({ itemId: l.itemId, quantity: l.qty }))));
    formData.set("customerName", customerName);
    formData.set("customerContact", customerContact);
    formData.set("vehicleReg", vehicleReg);
    formData.set("discount", discountText || "0");
    formData.set("paymentBreakdown", JSON.stringify(buildBreakdown()));

    const summary = { totalCents, changeCents: cashChangeCents };

    if (!isOnline) {
      enqueue("createSale", formDataToRecord(formData));
      setSuccess({ ...summary, queued: true });
      resetCart();
      setMobileCartOpen(false);
      return;
    }

    setSubmitting(true);
    const result = await createSale(undefined, formData);
    setSubmitting(false);
    if (result?.error) {
      toast({ title: "Could not complete the sale", description: result.error, variant: "error" });
      return;
    }
    setSuccess({ ...summary, queued: false });
    router.refresh();
    resetCart();
    setMobileCartOpen(false);
  }

  function resetCart() {
    setLines([]);
    setDiscountText("");
    setCashReceived("");
    setSplitMode(false);
    setSplitLegs([]);
    setCustomerName("");
    setCustomerContact("");
    setVehicleReg("");
  }

  function pickCustomer(customer: PosCustomer) {
    setCustomerName(customer.name);
    setCustomerContact(customer.contact);
    if (!vehicleReg && customer.vehicleReg) setVehicleReg(customer.vehicleReg);
  }

  function startNewSale() {
    setSuccess(null);
    setShowKeypad(false);
  }

  const itemCount = cartLines.reduce((sum, l) => sum + l.qty, 0);

  const cartPanel = (
    <CartPanel
      cartLines={cartLines}
      availableByItem={availableByItem}
      updateQty={updateQty}
      removeLine={removeLine}
      discountText={discountText}
      setDiscountText={setDiscountText}
      subtotalCents={subtotalCents}
      discountCents={discountCents}
      totalCents={totalCents}
      singleMethod={singleMethod}
      setSingleMethod={setSingleMethod}
      cashReceived={cashReceived}
      setCashReceived={setCashReceived}
      cashChangeCents={cashChangeCents}
      splitMode={splitMode}
      setSplitMode={setSplitMode}
      splitLegs={splitLegs}
      setSplitLegs={setSplitLegs}
      activeSplitLegId={activeSplitLegId}
      setActiveSplitLegId={setActiveSplitLegId}
      splitPaidCents={splitPaidCents}
      splitRemainingCents={splitRemainingCents}
      addCashBalanceLeg={addCashBalanceLeg}
      showKeypad={showKeypad}
      setShowKeypad={setShowKeypad}
      recentCustomers={recentCustomers}
      pickCustomer={pickCustomer}
      customerName={customerName}
      setCustomerName={setCustomerName}
      customerContact={customerContact}
      setCustomerContact={setCustomerContact}
      vehicleReg={vehicleReg}
      setVehicleReg={setVehicleReg}
      paymentReady={paymentReady}
      submitting={submitting}
      completeSale={completeSale}
      isOnline={isOnline}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">Register</h1>
          <p className="truncate text-sm text-muted">
            {shopName} · {isOnline ? (categories.length ? `${categories.join(", ")}` : "Checkout") : "Offline mode"}
          </p>
        </div>
        {isOnline && (
          <div className="hidden items-center gap-1.5 text-xs text-muted md:flex">
            <ShieldCheck className="size-3.5" aria-hidden />
            Scan or search an item to begin
          </div>
        )}
      </div>

      {success ? (
        <div className="grid place-items-center rounded-xl border border-border bg-surface py-14">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-full",
                success.queued
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
              )}
            >
              {success.queued ? (
                <WifiOff className="size-7" aria-hidden />
              ) : (
                <CheckCircle2 className="size-7" aria-hidden />
              )}
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {success.queued ? "Sale saved — we're offline" : "Sale complete"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Total {formatMoney(success.totalCents)}
                {success.changeCents > 0 && <> · Change {formatMoney(success.changeCents)}</>}
                {success.queued && " · It will sync automatically when you reconnect."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={startNewSale}>
                <Plus className="size-4" /> New sale
              </Button>
              <Button variant="outline" onClick={() => router.push("/shop/sales")}>
                View sales
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearchEnter();
                    }}
                    placeholder={
                      isOnline
                        ? "Search or scan barcode… (Enter to add)"
                        : "Search or scan barcode… (offline)"
                    }
                    autoFocus
                    aria-label="Search or scan an item"
                    inputMode="search"
                    className="h-11 pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <BarcodeScanner
                    label="Scan"
                    onDetect={(code) => {
                      const item = items.find(
                        (i) =>
                          i.barcode.toLowerCase() === code.toLowerCase() ||
                          i.sku.toLowerCase() === code.toLowerCase(),
                      );
                      if (item) {
                        addItem(item.id);
                        toast({ title: `${item.name} added` });
                      } else {
                        toast({ title: `No item for "${code}"`, variant: "error" });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {["All", ...categories].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      category === cat
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border-strong bg-surface text-zinc-600 hover:border-zinc-300 dark:text-zinc-300 dark:hover:border-zinc-600",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
                  <p className="text-sm font-medium text-foreground">No items found</p>
                  <p className="text-sm text-muted">
                    Try a different search, or add inventory first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item.id)}
                      disabled={item.available <= 0}
                      className={cn(
                        "group flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition-[transform,border-color] hover:-translate-y-0.5 hover:border-zinc-300 active:translate-y-0 dark:hover:border-zinc-600",
                        item.available <= 0 &&
                          "cursor-not-allowed opacity-50 hover:translate-y-0",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="size-9 rounded-md object-cover"
                          />
                        ) : (
                          <span className="flex size-9 items-center justify-center rounded-md bg-surface-strong text-xs font-bold text-muted">
                            {item.name
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => w[0] ?? "")
                              .join("")
                              .toUpperCase()}
                          </span>
                        )}
                        <Badge variant={item.available <= 2 ? "warning" : "success"}>
                          {item.available} left
                        </Badge>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        {item.sku && (
                          <p className="truncate text-[11px] text-muted">{item.sku}</p>
                        )}
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {formatMoney(item.unitPriceCents)}
                        </span>
                        <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">
                          +
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-[4.75rem] max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-xl border border-border bg-surface p-4">
                {cartPanel}
              </div>
            </div>
          </div>

          {/* Mobile checkout bar + sheet */}
          <div className="lg:hidden">
            <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setMobileCartOpen(true)}
                className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm"
              >
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <ShoppingCart className="size-4" aria-hidden />
                  {itemCount}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatMoney(totalCents)}
                </span>
              </button>
              <Button
                onClick={() => setMobileCartOpen(true)}
                disabled={itemCount === 0}
                className="h-10 px-5"
              >
                Checkout
              </Button>
            </div>

            <AnimatePresence>
              {mobileCartOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm dark:bg-zinc-950/70"
                    onClick={() => setMobileCartOpen(false)}
                    aria-hidden
                  />
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Checkout"
                    className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-24"
                  >
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground">Checkout</h2>
                      <button
                        type="button"
                        onClick={() => setMobileCartOpen(false)}
                        aria-label="Close checkout"
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                      >
                        <X className="size-5" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-3">{cartPanel}</div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

function CartPanel({
  cartLines,
  availableByItem,
  updateQty,
  removeLine,
  discountText,
  setDiscountText,
  subtotalCents,
  discountCents,
  totalCents,
  singleMethod,
  setSingleMethod,
  cashReceived,
  setCashReceived,
  cashChangeCents,
  splitMode,
  setSplitMode,
  splitLegs,
  setSplitLegs,
  activeSplitLegId,
  setActiveSplitLegId,
  splitPaidCents,
  splitRemainingCents,
  addCashBalanceLeg,
  showKeypad,
  setShowKeypad,
  recentCustomers,
  pickCustomer,
  customerName,
  setCustomerName,
  customerContact,
  setCustomerContact,
  vehicleReg,
  setVehicleReg,
  paymentReady,
  submitting,
  completeSale,
  isOnline,
}: {
  cartLines: { item: PosItem; qty: number; lineCents: number }[];
  availableByItem: Map<string, number>;
  updateQty: (itemId: string, qty: number) => void;
  removeLine: (itemId: string) => void;
  discountText: string;
  setDiscountText: (v: string) => void;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  singleMethod: Method;
  setSingleMethod: (m: Method) => void;
  cashReceived: string;
  setCashReceived: (v: string) => void;
  cashChangeCents: number;
  splitMode: boolean;
  setSplitMode: (v: boolean) => void;
  splitLegs: PaymentLeg[];
  setSplitLegs: (legs: PaymentLeg[]) => void;
  activeSplitLegId: string | null;
  setActiveSplitLegId: (id: string | null) => void;
  splitPaidCents: number;
  splitRemainingCents: number;
  addCashBalanceLeg: () => void;
  showKeypad: boolean;
  setShowKeypad: (v: boolean) => void;
  recentCustomers: PosCustomer[];
  pickCustomer: (c: PosCustomer) => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerContact: string;
  setCustomerContact: (v: string) => void;
  vehicleReg: string;
  setVehicleReg: (v: string) => void;
  paymentReady: boolean;
  submitting: boolean;
  completeSale: () => void;
  isOnline: boolean;
}) {
  const hasCashLegs = splitMode && splitLegs.some((l) => l.method === "cash");

  function editLeg(id: string, patch: Partial<PaymentLeg>) {
    setSplitLegs(splitLegs.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Current sale</h2>
        <Badge variant={cartLines.length ? "neutral" : "default"}>
          {cartLines.reduce((s, l) => s + l.qty, 0)} items
        </Badge>
      </div>

      {cartLines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted">
          No items yet — scan or tap an item to add it.
        </div>
      ) : (
        <ul className="divide-y divide-border/70">
          {cartLines.map(({ item, qty, lineCents }) => (
            <li key={item.id} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted">
                  {formatMoney(item.unitPriceCents)}
                  {item.unitName && item.unitName !== "piece" ? ` / ${item.unitName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border-strong bg-surface">
                <button
                  type="button"
                  onClick={() => updateQty(item.id, qty - 1)}
                  aria-label={`Decrease ${item.name}`}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <Minus className="size-3.5" aria-hidden />
                </button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums text-foreground">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => updateQty(item.id, qty + 1)}
                  disabled={qty >= (availableByItem.get(item.id) ?? 0)}
                  aria-label={`Increase ${item.name}`}
                  className="p-1.5 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 dark:hover:text-zinc-100"
                >
                  <Plus className="size-3.5" aria-hidden />
                </button>
              </div>
              <span className="w-16 text-right text-sm font-medium tabular-nums text-foreground">
                {formatMoney(lineCents)}
              </span>
              <button
                type="button"
                onClick={() => removeLine(item.id)}
                aria-label={`Remove ${item.name}`}
                className="p-1 text-zinc-400 hover:text-rose-600"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5 border-t border-border pt-3 text-sm">
        <div className="flex justify-between text-muted">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney(subtotalCents)}</span>
        </div>
        {discountCents > 0 && (
          <div className="flex justify-between text-rose-600 dark:text-rose-400">
            <span>Discount</span>
            <span className="tabular-nums">−{formatMoney(discountCents)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-dashed border-border pt-1.5">
          <span className="font-semibold text-foreground">Total</span>
          <span className="text-base font-bold tabular-nums text-foreground">
            {formatMoney(totalCents)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="discount">Discount</Label>
          <Input
            id="discount"
            type="number"
            min="0"
            step="0.01"
            value={discountText}
            onChange={(e) => setDiscountText(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div>
          <Label>Payment</Label>
          {!splitMode ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-1.5">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setSingleMethod(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                      singleMethod === m.value
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-border-strong bg-surface text-zinc-600 hover:border-zinc-300 dark:text-zinc-300 dark:hover:border-zinc-600",
                    )}
                  >
                    <m.icon className="size-4" aria-hidden />
                    {m.label}
                  </button>
                ))}
              </div>
              {singleMethod === "cash" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label htmlFor="cashReceived">Cash received</Label>
                      <Input
                        id="cashReceived"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        onFocus={() => setShowKeypad(true)}
                        placeholder="0.00"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowKeypad(!showKeypad)}
                      className="mb-0.5"
                    >
                      {showKeypad ? "Hide" : "Keypad"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted">
                    Change due{" "}
                    <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatMoney(cashChangeCents)}
                    </span>
                  </p>
                  <Numpad
                    className={showKeypad ? "" : "hidden"}
                    onInput={(key) => setCashReceived(applyKey(cashReceived, key))}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {splitLegs.map((leg, index) => (
                <div key={leg.id} className="flex items-center gap-2">
                  <select
                    value={leg.method}
                    onChange={(e) => editLeg(leg.id, { method: e.target.value as Method })}
                    aria-label={`Payment method ${index + 1}`}
                    className="h-9 flex-1 rounded-lg border border-border-strong bg-surface px-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    {METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <div className="relative w-24">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={leg.amount}
                      onChange={(e) => editLeg(leg.id, { amount: e.target.value })}
                      onFocus={() => {
                        setActiveSplitLegId(leg.id);
                        setShowKeypad(true);
                      }}
                      placeholder="0.00"
                      className="pr-1 text-right"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSplitLegs(splitLegs.filter((l) => l.id !== leg.id))}
                    aria-label="Remove payment leg"
                    className="p-1.5 text-zinc-400 hover:text-rose-600"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSplitLegs([
                      ...splitLegs,
                      { id: nextLegId(), method: "cash", amount: (splitRemainingCents > 0 ? splitRemainingCents : 0).toFixed(2) },
                    ])
                  }
                  className="rounded-lg border border-dashed border-brand/50 px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft"
                >
                  + Add payment
                </button>
                {splitRemainingCents > 0 && !hasCashLegs && (
                  <button
                    type="button"
                    onClick={addCashBalanceLeg}
                    className="rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-300 dark:text-zinc-300 dark:hover:border-zinc-600"
                    title="Set cash leg to the remaining balance"
                  >
                    Cash for balance
                  </button>
                )}
              </div>
              <p className="text-sm">
                <span className="text-muted">Paid {formatMoney(splitPaidCents)}</span>
                {splitRemainingCents > 0 ? (
                  <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                    Remaining {formatMoney(splitRemainingCents)}
                  </span>
                ) : (
                  <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                    Fully paid
                  </span>
                )}
              </p>
              <Numpad
                className={showKeypad ? "" : "hidden"}
                onInput={(key) => {
                  const targetId =
                    activeSplitLegId ?? splitLegs[splitLegs.length - 1]?.id;
                  if (!targetId) return;
                  const leg = splitLegs.find((l) => l.id === targetId);
                  if (!leg) return;
                  editLeg(targetId, { amount: applyKey(leg.amount, key) });
                }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setSplitMode(!splitMode);
              if (!splitMode && splitLegs.length === 0) {
                setSplitLegs([{ id: nextLegId(), method: "cash", amount: "" }]);
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-hover"
          >
            <Split className="size-3.5" aria-hidden />
            {splitMode ? "Back to single payment" : "Split payment"}
          </button>
        </div>

        <div className="space-y-2.5 border-t border-border pt-3">
          <Label htmlFor="customerName">Customer</Label>
          {recentCustomers.length > 0 && (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {recentCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => pickCustomer(customer)}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    customerName === customer.name
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border-strong bg-surface text-zinc-600 hover:border-zinc-300 dark:text-zinc-300 dark:hover:border-zinc-600",
                  )}
                >
                  <User2 className="mr-1 inline size-3" aria-hidden />
                  {customer.name}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              aria-label="Customer name"
            />
            <Input
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              placeholder="Phone / email"
              aria-label="Customer contact"
            />
          </div>
          <Input
            value={vehicleReg}
            onChange={(e) => setVehicleReg(e.target.value)}
            placeholder="Vehicle reg (optional)"
            aria-label="Vehicle registration"
            className="font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <WifiOff className="size-3.5" aria-hidden /> Will be queued offline
            </span>
          )}
        </div>

        <Button
          onClick={completeSale}
          className="h-11 w-full text-sm"
          loading={submitting}
          disabled={!paymentReady || cartLines.length === 0}
        >
          {cashChangeCents > 0 && !splitMode && singleMethod === "cash"
            ? `Change ${formatMoney(cashChangeCents)} · Collect ${formatMoney(totalCents)}`
            : `Complete sale · ${formatMoney(totalCents)}`}
        </Button>
        {!paymentReady && totalCents > 0 && (
          <p className="text-center text-xs text-muted">
            {splitMode
              ? "Payment amounts must add up to the total exactly."
              : singleMethod === "cash"
                ? "Enter cash received to cover the total."
                : "Enter payment to continue."}
          </p>
        )}
      </div>
    </div>
  );
}

