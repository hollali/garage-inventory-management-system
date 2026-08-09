"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { WORK_ORDER_STATUS_LABELS } from "./work-order-status";

const options = [
  { value: "All", label: "All statuses" },
  ...Object.entries(WORK_ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export function WorkOrdersFilter({ base = "/admin/work-orders" }: { base?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "All";

  function apply(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "All") params.set("status", value);
    else params.delete("status");
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `${base}?${qs}` : base);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={status}
        onChange={(e) => apply(e.target.value)}
        className="sm:w-56"
        aria-label="Filter by status"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {status !== "All" && (
        <Button variant="ghost" onClick={() => apply("All")}>
          Clear
        </Button>
      )}
    </div>
  );
}
