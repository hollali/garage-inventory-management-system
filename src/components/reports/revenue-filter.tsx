"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";

export function RevenueFilter({
  shops,
  currentShopId,
}: {
  shops: { id: string; name: string }[];
  currentShopId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function apply(shopId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (shopId) params.set("shop", shopId);
    else params.delete("shop");
    const qs = params.toString();
    router.push(qs ? `/admin/reports?${qs}` : "/admin/reports");
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentShopId}
        onChange={(e) => apply(e.target.value)}
        aria-label="Filter revenue by shop"
        className="w-auto min-w-44"
      >
        <option value="">All shops</option>
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      {currentShopId && (
        <Button variant="ghost" size="sm" onClick={() => apply("")}>
          Clear
        </Button>
      )}
    </div>
  );
}
