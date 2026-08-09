import { Badge } from "@/components/ui/badge";

export type WorkOrderStatus = "open" | "in_progress" | "completed" | "cancelled";

const config: Record<
  WorkOrderStatus,
  { variant: "default" | "success" | "warning" | "danger" | "info" | "neutral"; label: string }
> = {
  open: { variant: "neutral", label: "Open" },
  in_progress: { variant: "info", label: "In progress" },
  completed: { variant: "success", label: "Completed" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  const c = config[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
