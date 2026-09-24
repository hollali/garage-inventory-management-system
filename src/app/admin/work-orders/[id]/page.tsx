import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { getWorkOrderDetail } from "@/lib/queries/work-orders";
import { formatDateTime } from "@/lib/utils";
import { WorkOrderViewer } from "@/components/work-orders/work-order-viewer";

export default async function AdminWorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const detail = await getWorkOrderDetail(id);
  if (!detail) {
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
      items={[]}
      canEdit={false}
      backHref="/admin/work-orders"
    />
  );
}