"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refundSale } from "@/lib/actions/sales";
import { ReceiptModal } from "@/components/sales/receipt-modal";
import { Button, IconButton } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormError } from "@/components/ui/forms";
import { useToast } from "@/components/ui/toast";
import { FileText, RotateCcw } from "lucide-react";
import type { SaleReceipt } from "@/lib/queries/sales";

export function SaleRowActions({
  saleId,
  status,
  receipt,
  shopName,
}: {
  saleId: string;
  status: "complete" | "refunded";
  receipt: SaleReceipt;
  shopName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function closeConfirm() {
    if (!pending) {
      setError(null);
      setConfirmOpen(false);
    }
  }

  function handleRefund() {
    setError(null);
    const formData = new FormData();
    formData.set("saleId", saleId);
    startTransition(async () => {
      const result = await refundSale(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      toast({
        title: "Sale refunded",
        description: "Items returned to stock.",
      });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton label="View receipt" onClick={() => setReceiptOpen(true)}>
        <FileText className="size-4" />
      </IconButton>
      {status === "complete" && (
        <IconButton
          label="Refund sale"
          onClick={() => setConfirmOpen(true)}
          variant="danger"
        >
          <RotateCcw className="size-4" />
        </IconButton>
      )}
      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        shopName={shopName}
        receipt={receipt}
      />
      <Modal
        open={confirmOpen}
        onClose={closeConfirm}
        title="Refund this sale?"
        description="The items will be returned to stock and the sale marked as refunded."
        size="sm"
      >
        <div className="flex flex-col gap-4">
          {error && <FormError>{error}</FormError>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeConfirm} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRefund} loading={pending}>
              Refund sale
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
