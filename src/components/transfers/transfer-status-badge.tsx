import { Badge } from "@/components/ui/badge";
import type { TransferRequestStatus } from "@/lib/queries/transfers";

const tones: Record<
  TransferRequestStatus,
  "default" | "success" | "warning" | "danger" | "info" | "neutral"
> = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  completed: "success",
};

const labels: Record<TransferRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

export function TransferStatusBadge({ status }: { status: TransferRequestStatus }) {
  return <Badge variant={tones[status]}>{labels[status]}</Badge>;
}
