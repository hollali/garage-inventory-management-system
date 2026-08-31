"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";
import { importItemsCsv } from "@/lib/actions/import";
import { parseCsv } from "@/lib/csv";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea, FormError, FormSuccess } from "@/components/ui/forms";
import { useToast } from "@/components/ui/toast";

type PreviewRow = { name: string; sku: string; quantity: string; unitPrice: string };

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);

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
      setCsv("");
      setFileName(null);
      setPreview([]);
      toast({
        title: "Import complete",
        description: `Imported ${created} item${created === 1 ? "" : "s"}.`,
      });
      router.refresh();
    }
    if (!actionState?.ok) prevOk.current = false;
  }, [open, actionState, router, toast]);

  function handleCsvChange(value: string) {
    setCsv(value);
    setPreview(buildPreview(value));
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setFileName(file.name);
    handleCsvChange(text);
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function buildPreview(value: string): PreviewRow[] {
    const rows = parseCsv(value);
    if (rows.length < 2) return [];
    const headers = rows[0].map((h) => h.toLowerCase());
    const idx = (name: string) => headers.indexOf(name);
    const iName = idx("name");
    const iSku = idx("sku");
    const iQty = idx("quantity");
    const iPrice = idx("unitprice");
    return rows
      .slice(1, 6)
      .map((fields) => ({
        name: iName >= 0 ? fields[iName] ?? "" : "",
        sku: iSku >= 0 ? fields[iSku] ?? "" : "",
        quantity: iQty >= 0 ? fields[iQty] ?? "" : "",
        unitPrice: iPrice >= 0 ? fields[iPrice] ?? "" : "",
      }))
      .filter((r) => r.name);
  }

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
            <Label htmlFor="csv-file">Upload CSV file</Label>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                aria-hidden
                onChange={handleFileInput}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="justify-start"
              >
                <Upload className="size-4" />
                {fileName ? `Replace file: ${fileName}` : "Choose CSV file"}
              </Button>
              {fileName && (
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <FileText className="size-3.5" aria-hidden />
                  {fileName} selected
                </p>
              )}
              {!fileName && (
                <p className="text-xs text-muted">
                  Or paste the CSV data below.
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="csv">CSV data</Label>
            <Textarea
              id="csv"
              name="csv"
              required
              value={csv}
              onChange={(e) => handleCsvChange(e.target.value)}
              placeholder={"name,category,sku,barcode,quantity,unitPrice,cost,lowStockThreshold\nOil filter,Filters,,1234567890,50,12.50,8.00,10"}
              className="font-mono"
            />
            <p className="mt-1 text-xs text-muted">
              Headers: <code className="font-mono">name, category, sku, barcode, quantity,
              unitPrice, cost, lowStockThreshold</code> (also supports{" "}
              <code className="font-mono">description, unitName, itemsPerUnit</code>). Only{" "}
              <code className="font-mono">name</code> is required; rows with an empty name are
              skipped.
            </p>
          </div>

          {preview.length > 0 && (
            <div>
              <Label>Preview</Label>
              <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/40 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">SKU</th>
                      <th className="px-3 py-2 font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Unit price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {preview.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5 text-muted">{r.sku}</td>
                        <td className="px-3 py-1.5 text-muted">{r.quantity}</td>
                        <td className="px-3 py-1.5 text-muted">{r.unitPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parseCsv(csv).length - 1 > preview.length && (
                <p className="mt-1 text-xs text-muted">
                  Showing first {preview.length} of {parseCsv(csv).length - 1} rows.
                </p>
              )}
            </div>
          )}

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
            <Button type="submit" loading={pending} disabled={csv.trim().length === 0}>
              Import
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
