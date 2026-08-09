"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { transferStock } from "@/lib/actions/admin";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FormError } from "@/components/ui/forms";

export type TransferableItem = {
  id: string;
  name: string;
  quantity: number;
  shopId: string | null;
};

const CENTRAL = "central";

export function TransferModal({
  items,
  shops,
  sourceShopId,
  itemId,
  trigger,
}: {
  items: TransferableItem[];
  shops: { id: string; name: string }[];
  sourceShopId?: string | null;
  itemId?: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<string>(sourceShopId ?? CENTRAL);
  const [selectedItem, setSelectedItem] = useState<string>(itemId ?? "");
  const [dest, setDest] = useState<string>(sourceShopId ? "" : shops[0]?.id ?? "");
  const [qty, setQty] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => transferStock(formData),
    undefined,
  );
  const actionState = state as { ok?: boolean; error?: string } | undefined;

  const prevOk = useRef(false);
  useEffect(() => {
    if (open && actionState?.ok && !prevOk.current) {
      prevOk.current = true;
      setOpen(false);
      router.refresh();
    }
    if (!actionState?.ok) prevOk.current = false;
  }, [open, actionState, router]);

  const sourceItems = items.filter((i) => (i.shopId ?? CENTRAL) === source);
  const currentItem = sourceItems.find((i) => i.id === selectedItem);
  const destOptions = [
    ...(source === CENTRAL ? [] : [{ id: "", name: "Central pool" }]),
    ...shops.filter((s) => s.id !== source),
  ];

  function changeSource(value: string) {
    setSource(value);
    setSelectedItem("");
    setQty("");
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="Move stock">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="fromItemId" value={selectedItem} />
          <input type="hidden" name="toShopId" value={dest} />
          {actionState?.error && <FormError>{actionState.error}</FormError>}

          <div>
            <Label htmlFor="source">From</Label>
            <Select id="source" value={source} onChange={(e) => changeSource(e.target.value)}>
              <option value={CENTRAL}>Central pool</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="transfer-item">Item</Label>
            <Select
              id="transfer-item"
              value={selectedItem}
              onChange={(e) => {
                setSelectedItem(e.target.value);
                setQty("");
              }}
              required
            >
              <option value="">Select an item…</option>
              {sourceItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.quantity} in stock)
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="dest">To</Label>
            <Select id="dest" value={dest} onChange={(e) => setDest(e.target.value)} required>
              <option value="">Choose a destination…</option>
              {destOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              name="quantity"
              type="number"
              min="1"
              max={currentItem?.quantity ?? 1}
              step="1"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
            />
            {currentItem && (
              <p className="mt-1 text-xs text-muted">
                Available: {currentItem.quantity}. Transfer records stock-out here and stock-in at the
                destination.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} disabled={!selectedItem || !dest || !qty}>
              Move stock
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
