"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refundSale } from "@/lib/actions/sales";
import { ReceiptModal } from "@/components/sales/receipt-modal";
import { IconButton } from "@/components/ui/button";
import { FiFileText, FiRotateCcw } from "react-icons/fi";
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
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleRefund() {
    if (
      !window.confirm(
        "Refund this sale? The items will be returned to stock and the sale marked as refunded.",
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("saleId", saleId);
    startTransition(async () => {
      const result = await refundSale(formData);
      if (result?.error) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton label="View receipt" onClick={() => setReceiptOpen(true)}>
        <FiFileText className="size-4" />
      </IconButton>
      {status === "complete" && (
        <IconButton
          label="Refund sale"
          onClick={handleRefund}
          loading={pending}
          className="text-red-600 hover:text-red-700"
        >
          <FiRotateCcw className="size-4" />
        </IconButton>
      )}
      <ReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        shopName={shopName}
        receipt={receipt}
      />
    </div>
  );
}
