"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "@/lib/actions/purchasing";
import { formatMoney } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FormError } from "@/components/ui/forms";
import { useToast } from "@/components/ui/toast";
import { useUrlModal } from "@/components/ui/use-url-modal";

export type PoShopOption = { id: string; name: string };
export type PoSupplierOption = { id: string; name: string };
export type PoItemOption = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  quantity: number;
  unitPriceCents: number;
  costCents: number;
  shopId: string | null;
};

type Line = { itemId: string; quantity: number; unitCost: number };

export function PoModal({
  shops,
  suppliers,
  items,
  trigger,
  urlAction,
}: {
  shops: PoShopOption[];
  suppliers: PoSupplierOption[];
  items: PoItemOption[];
  trigger: ReactNode;
  urlAction?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { open: urlOpen, close: closeUrlModal } = useUrlModal(urlAction);
  const [localOpen, setLocalOpen] = useState(false);
  const open = localOpen || urlOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      setLocalOpen(next);
      if (!next) closeUrlModal();
    },
    [closeUrlModal],
  );
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(createPurchaseOrder, undefined);
  const actionState = state as { ok?: boolean; error?: string } | undefined;

  const prevOk = useRef(false);
  useEffect(() => {
    if (open && actionState?.ok && !prevOk.current) {
      prevOk.current = true;
      setOpen(false);
      toast({ title: "Purchase order created" });
      router.refresh();
    }
    if (!actionState?.ok) prevOk.current = false;
  }, [open, actionState, router, setOpen, toast]);

  const itemById = useMemo(() => {
    const map = new Map<string, PoItemOption>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const availableItems = useMemo(
    () =>
      selectedShop === ""
        ? items.filter((i) => i.shopId === null)
        : items.filter((i) => i.shopId === selectedShop),
    [items, selectedShop],
  );

  const totalCents = lines.reduce(
    (sum, line) => sum + Math.round(line.unitCost * 100) * line.quantity,
    0,
  );

  function openModal() {
    setLines([]);
    setSelectedShop("");
    setSelectedItem("");
    setQuantity("1");
    setUnitCost("");
    setError(null);
    setOpen(true);
  }

  function handleItemChange(value: string) {
    setSelectedItem(value);
    const item = itemById.get(value);
    if (item) {
      const suggested = item.costCents > 0 ? item.costCents : item.unitPriceCents;
      setUnitCost(suggested > 0 ? (suggested / 100).toFixed(2) : "");
    }
  }

  function addLine() {
    setError(null);
    if (!selectedItem) return;
    const parsedQty = parseInt(quantity, 10);
    const parsedCost = parseFloat(unitCost);
    if (Number.isNaN(parsedQty) || parsedQty < 1) {
      setError("Quantity must be a whole number of at least 1.");
      return;
    }
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      setError("Enter a valid unit cost.");
      return;
    }
    setLines([...lines, { itemId: selectedItem, quantity: parsedQty, unitCost: parsedCost }]);
    setSelectedItem("");
    setQuantity("1");
    setUnitCost("");
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  return (
    <>
      <span onClick={openModal}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="Create a purchase order" size="lg">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="lines" value={JSON.stringify(lines)} />
          {actionState?.error && <FormError>{actionState.error}</FormError>}
          {error && <FormError>{error}</FormError>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="shopId">Shop</Label>
              <Select
                id="shopId"
                name="shopId"
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
              >
                <option value="">Central pool</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="supplierId">Supplier</Label>
              <Select id="supplierId" name="supplierId" required>
                <option value="">Select a supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label>Add items</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Select
                value={selectedItem}
                onChange={(e) => handleItemChange(e.target.value)}
                className="flex-1"
              >
                <option value="">Select an item…</option>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {formatMoney(item.unitPriceCents)}
                  </option>
                ))}
              </Select>
              <div className="flex gap-2">
                <div>
                  <Label htmlFor="lineQty">Qty</Label>
                  <Input
                    id="lineQty"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-20"
                  />
                </div>
                <div>
                  <Label htmlFor="lineCost">Unit cost</Label>
                  <Input
                    id="lineCost"
                    type="number"
                    min={0}
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-28"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={addLine} disabled={!selectedItem}>
                Add line
              </Button>
            </div>
            {availableItems.length === 0 && (
              <p className="mt-1 text-xs text-muted">
                No items in this location yet — pick a different shop or add inventory first.
              </p>
            )}
          </div>

          {lines.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Unit cost</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                  {lines.map((line, index) => {
                    const item = itemById.get(line.itemId);
                    return (
                      <tr key={`${line.itemId}-${index}`}>
                        <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                          {item?.name ?? "Unknown item"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(Math.round(line.unitCost * 100))}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{line.quantity}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                          {formatMoney(Math.round(line.unitCost * 100) * line.quantity)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-zinc-50 dark:bg-zinc-800/40">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatMoney(totalCents)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-8 text-center text-sm text-muted">
              No lines yet — select an item above and press “Add line”.
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Optional notes about this order…" />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={lines.length === 0} loading={pending}>
              Create PO · {formatMoney(totalCents)}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
