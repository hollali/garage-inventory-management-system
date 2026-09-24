import { notFound } from "next/navigation";
import { requireAttendantShop } from "@/lib/dal";
import { getItemsForWorkOrder, getWorkOrderDetail } from "@/lib/queries/work-orders";
import { formatDateTime } from "@/lib/utils";
import { WorkOrderViewer } from "@/components/work-orders/work-order-viewer";

export default async function ShopWorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const shop = await requireAttendantShop();
  const { id } = await params;

  const [detail, items] = await Promise.all([
    getWorkOrderDetail(id),
    getItemsForWorkOrder(shop.id),
  ]);

  if (!detail || detail.workOrder.shopId !== shop.id) {
    notFound();
  }

  return (
    <WorkOrderViewer
      workOrder={{
        id: detail.workOrder.id,
        vehicleReg: detail.workOrder.vehicleReg,
        customerName: detail.workOrder.customerName,
        customerContact: detail.workOrder.customerContact,
        status: detail.workOrder.status,
        labourCents: detail.workOrder.labourCents,
        partsTotalCents: detail.workOrder.partsTotalCents,
        notes: detail.workOrder.notes,
        shopName: detail.workOrder.shopName,
        createdByName: detail.workOrder.createdByName,
        createdAt: formatDateTime(detail.workOrder.createdAt),
      }}
      parts={detail.parts}
      items={items}
      canEdit
      backHref="/shop/work-orders"
    />
  );
}