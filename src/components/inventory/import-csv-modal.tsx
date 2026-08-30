"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { importItemsCsv } from "@/lib/actions/import";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea, FormError, FormSuccess } from "@/components/ui/forms";
import { useToast } from "@/components/ui/toast";

export function ImportCsvModal({
  shops,
  trigger,
}: {
  shops: { id: string; name: string }[];
  trigger: ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, formData: FormData) => importItemsCsv(formData),
    undefined,
  );
  const actionState = state as { ok?: boolean; error?: string; created?: number } | undefined;

  const prevOk = useRef(false);
  useEffect(() => {
    if (open && actionState?.ok && !prevOk.current) {
      prevOk.current = true;
      const created = actionState.created ?? 0;
      setOpen(false);
      toast({
        title: "Import complete",
        description: `Imported ${created} item${created === 1 ? "" : "s"}.`,
      });
      router.refresh();
    }
    if (!actionState?.ok) prevOk.current = false;
  }, [open, actionState, router, toast]);

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="Import items from CSV" size="lg">
        <form action={formAction} className="flex flex-col gap-4">
          {actionState?.error && <FormError>{actionState.error}</FormError>}
          {actionState?.ok && (
            <FormSuccess>
              Imported {actionState.created ?? 0} item{(actionState.created ?? 0) === 1 ? "" : "s"}.
            </FormSuccess>
          )}

          <div>
            <Label htmlFor="csv">CSV data</Label>
            <Textarea
              id="csv"
              name="csv"
              required
              placeholder={"name,category,sku,barcode,quantity,unitPrice,cost,lowStockThreshold\nOil filter,Filters,,1234567890,50,12.50,8.00,10"}
              className="font-mono"
            />
            <p className="mt-1 text-xs text-muted">
              Headers: <code className="font-mono">name, category, sku, barcode, quantity, unitPrice,
              cost, lowStockThreshold</code>. Only <code className="font-mono">name</code> is required;
              rows with an empty name are skipped.
            </p>
          </div>

          <div>
            <Label htmlFor="import-shop">Shop</Label>
            <Select id="import-shop" name="shopId" defaultValue="">
              <option value="">Central pool</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Import
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
