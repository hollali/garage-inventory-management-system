"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { requestTransfer } from "@/lib/actions/transfers";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FormError } from "@/components/ui/forms";

const CENTRAL = "central";

export function RequestTransferModal({
  items,
  otherShops,
  trigger,
}: {
  items: { id: string; name: string; quantity: number }[];
  otherShops: { id: string; name: string }[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState("");
  const [dest, setDest] = useState(CENTRAL);
  const [qty, setQty] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => requestTransfer(formData),
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

  const currentItem = items.find((i) => i.id === selectedItem);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="Request stock">
        <form action={formAction} className="flex flex-col gap-4">
          {actionState?.error && <FormError>{actionState.error}</FormError>}

          <div>
            <Label htmlFor="transfer-item">Item</Label>
            <Select
              id="transfer-item"
              name="itemId"
              value={selectedItem}
              onChange={(e) => {
                setSelectedItem(e.target.value);
                setQty("");
              }}
              required
            >
              <option value="">Select an item…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.quantity} in stock)
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="transfer-dest">Destination</Label>
            <Select id="transfer-dest" name="toShopId" value={dest} onChange={(e) => setDest(e.target.value)} required>
              <option value={CENTRAL}>Central pool</option>
              {otherShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="transfer-qty">Quantity</Label>
            <Input
              id="transfer-qty"
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
                Available: {currentItem.quantity}. Admin approval moves the stock.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="transfer-note">Note</Label>
            <Textarea
              id="transfer-note"
              name="note"
              placeholder="Optional note for the admin…"
              className="min-h-20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} disabled={!selectedItem || !qty}>
              Request stock
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
