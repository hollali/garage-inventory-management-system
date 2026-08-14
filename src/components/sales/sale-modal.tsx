"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/lib/actions/sales";
import { formatMoney } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FormError } from "@/components/ui/forms";

type SaleItemOption = {
  id: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

type Line = { itemId: string; quantity: number };

export function SaleModal({
  items,
  trigger,
}: {
  items: SaleItemOption[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [selected, setSelected] = useState("");
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const itemById = useMemo(() => {
    const map = new Map<string, SaleItemOption>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  const totalCents = lines.reduce((sum, line) => {
    const item = itemById.get(line.itemId);
    return sum + (item ? item.unitPriceCents * line.quantity : 0);
  }, 0);

  const discountCents = Math.round((Number(discount) || 0) * 100);
  const netTotalCents = Math.max(0, totalCents - discountCents);

  const inStock = items.filter((i) => i.quantity > 0);

  function openModal() {
    setLines([]);
    setSelected("");
    setDiscount("0");
    setError(null);
    setOpen(true);
  }

  function addLine() {
    if (!selected) return;
    setError(null);
    const existing = lines.find((l) => l.itemId === selected);
    if (existing) {
      setLines(lines.map((l) => (l.itemId === selected ? { ...l, quantity: l.quantity + 1 } : l)));
    } else {
      setLines([...lines, { itemId: selected, quantity: 1 }]);
    }
    setSelected("");
  }

  function updateQuantity(itemId: string, quantity: number) {
    setLines(lines.map((l) => (l.itemId === itemId ? { ...l, quantity } : l)));
  }

  function removeLine(itemId: string) {
    setLines(lines.filter((l) => l.itemId !== itemId));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (lines.length === 0) {
      setError("Add at least one item to the sale.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("lines", JSON.stringify(lines));

    startTransition(async () => {
      const result = await createSale(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <span onClick={openModal}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="Record a sale" size="lg">
        {inStock.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted">
              No items in stock to sell. Add inventory or restock first.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <FormError>{error}</FormError>}

            <div>
              <Label>Add items to sale</Label>
              <div className="flex gap-2">
                <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1">
                  <option value="">Select an item…</option>
                  {inStock.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {formatMoney(item.unitPriceCents)} ({item.quantity} on hand)
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="secondary" onClick={addLine} disabled={!selected}>
                  Add
                </Button>
              </div>
            </div>

            {lines.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40 text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Unit price</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                    {lines.map((line) => {
                      const item = itemById.get(line.itemId);
                      if (!item) return null;
                      return (
                        <tr key={line.itemId}>
                          <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{item.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatMoney(item.unitPriceCents)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={line.quantity}
                              onChange={(e) =>
                                updateQuantity(line.itemId, Math.max(1, Number(e.target.value) || 1))
                              }
                              className="w-16 rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-right text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                            {formatMoney(item.unitPriceCents * line.quantity)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeLine(line.itemId)}
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
                    {discountCents > 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-1 text-right text-zinc-600 dark:text-zinc-400">
                          Discount
                        </td>
                        <td className="px-3 py-1 text-right tabular-nums text-red-600">
                          −{formatMoney(discountCents)}
                        </td>
                        <td />
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {formatMoney(netTotalCents)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-8 text-center text-sm text-muted">
                No items added yet — select items above.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="customerName">Customer name</Label>
                <Input id="customerName" name="customerName" placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="customerContact">Customer contact</Label>
                <Input id="customerContact" name="customerContact" placeholder="Phone / email — optional" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="paymentMethod">Payment method</Label>
                <Select id="paymentMethod" name="paymentMethod" defaultValue="cash">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile money</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="discount">Discount ($)</Label>
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vehicleReg">Vehicle registration</Label>
              <Input id="vehicleReg" name="vehicleReg" placeholder="KXX 123A — optional" />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={lines.length === 0} loading={pending}>
                Complete sale · {formatMoney(netTotalCents)}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
