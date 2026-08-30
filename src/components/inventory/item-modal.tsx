"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createItem, updateItem } from "@/lib/actions/attendant";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FormError, FormSection } from "@/components/ui/forms";
import { useToast } from "@/components/ui/toast";
import { useUrlModal } from "@/components/ui/use-url-modal";

export type ItemShape = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  description: string | null;
  unitPriceCents: number;
  costCents: number;
  barcode: string | null;
  imageUrl: string | null;
  unitName: string;
  itemsPerUnit: number;
  lowStockThreshold: number;
  quantity: number;
};

export function ItemModal({
  categories,
  item,
  trigger,
  urlAction,
}: {
  categories: string[];
  item?: ItemShape;
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
  const action = item ? updateItem : createItem;
  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => action(formData),
    undefined,
  );
  const actionState = state as { ok?: boolean; error?: string } | undefined;

  const prevOk = useRef(false);
  useEffect(() => {
    if (open && actionState?.ok && !prevOk.current) {
      prevOk.current = true;
      setOpen(false);
      toast({
        title: item ? "Item updated" : "Item added",
      });
      router.refresh();
    }
    if (!actionState?.ok) prevOk.current = false;
  }, [open, actionState, router, item, toast, setOpen]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={item ? "Edit item" : "Add item"}
        size="lg"
      >
        <form action={formAction} className="flex flex-col gap-5">
          {item && <input type="hidden" name="id" value={item.id} />}
          {actionState?.error && <FormError>{actionState.error}</FormError>}

          <FormSection title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Item name</Label>
                <Input id="name" name="name" required defaultValue={item?.name} />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  list="item-categories"
                  required
                  defaultValue={item?.category}
                  placeholder="e.g. Power tools"
                />
                <datalist id="item-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={item?.description ?? ""}
                  placeholder="Optional notes about the item…"
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Pricing & stock">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="unitPrice">Unit price</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={item ? (item.unitPriceCents / 100).toFixed(2) : undefined}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={item ? (item.costCents / 100).toFixed(2) : undefined}
                  placeholder="0.00"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="quantity">
                  Quantity on hand{item ? " (changes are logged as a stock adjustment)" : ""}
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={item?.quantity ?? 0}
                />
              </div>
              <div>
                <Label htmlFor="unitName">Unit name</Label>
                <Input
                  id="unitName"
                  name="unitName"
                  maxLength={50}
                  defaultValue={item?.unitName ?? "piece"}
                  placeholder="piece"
                />
              </div>
              <div>
                <Label htmlFor="itemsPerUnit">Items per unit</Label>
                <Input
                  id="itemsPerUnit"
                  name="itemsPerUnit"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={item?.itemsPerUnit ?? 1}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Tracking">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" defaultValue={item?.sku ?? ""} placeholder="Auto-generated" />
                <p className="mt-1 text-xs text-muted">
                  {item
                    ? "Leave blank to keep the current SKU."
                    : "Leave blank to auto-generate a SKU from the category."}
                </p>
              </div>
              <div>
                <Label htmlFor="lowStockThreshold">Low-stock threshold</Label>
                <Input
                  id="lowStockThreshold"
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={item?.lowStockThreshold ?? 5}
                />
              </div>
              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  name="barcode"
                  maxLength={100}
                  defaultValue={item?.barcode ?? ""}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  maxLength={500}
                  defaultValue={item?.imageUrl ?? ""}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </FormSection>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {item ? "Save changes" : "Create item"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
