import { createSale } from "@/lib/actions/sales";
import {
  addWorkOrderPart,
  createWorkOrder,
  removeWorkOrderPart,
  setWorkOrderStatus,
  updateWorkOrder,
} from "@/lib/actions/work-orders";
import {
  recordToFormData,
  type QueuedOp,
} from "@/lib/offline/queue";

type ActionResult = { ok?: boolean; error?: string; saleId?: string };

export async function runQueuedOp(op: QueuedOp): Promise<ActionResult> {
  const formData = recordToFormData(op.data);

  switch (op.type) {
    case "createSale":
      return (await createSale(undefined, formData)) as ActionResult;
    case "createWorkOrder":
      return (await createWorkOrder(formData)) as ActionResult;
    case "updateWorkOrder":
      return (await updateWorkOrder(formData)) as ActionResult;
    case "addWorkOrderPart":
      return (await addWorkOrderPart(formData)) as ActionResult;
    case "removeWorkOrderPart":
      return (await removeWorkOrderPart(formData)) as ActionResult;
    case "setWorkOrderStatus":
      return (await setWorkOrderStatus(formData)) as ActionResult;
    default:
      return { error: `Unknown queued action "${op.type}".` };
  }
}