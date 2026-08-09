"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input, Select } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";

export function AdminInventoryFilter({
  categories,
  shopList,
}: {
  categories: string[];
  shopList: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "All";
  const shopId = searchParams.get("shopId") ?? "All";
  const type = searchParams.get("type") ?? "All";

  function apply(next: { q?: string; category?: string; shopId?: string; type?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string, ignore: string) => {
      if (value && value !== ignore) params.set(key, value);
      else params.delete(key);
    };
    setOrDelete("q", next.q ?? q, "");
    setOrDelete("category", next.category ?? category, "All");
    setOrDelete("shopId", next.shopId ?? shopId, "All");
    setOrDelete("type", next.type ?? type, "All");
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `/admin/inventory?${qs}` : "/admin/inventory");
  }

  const hasFilters = q || (category && category !== "All") || (shopId && shopId !== "All") || (type && type !== "All");

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Input
        defaultValue={q}
        placeholder="Search items, SKUs, categories…"
        className="sm:max-w-64"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply({ q: (e.target as HTMLInputElement).value });
          }
        }}
        onBlur={(e) => apply({ q: e.target.value })}
      />
      <Select value={category} onChange={(e) => apply({ category: e.target.value })} className="sm:w-44">
        <option value="All">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Select value={shopId} onChange={(e) => apply({ shopId: e.target.value })} className="sm:w-48">
        <option value="All">All shops</option>
        <option value="none">Central pool</option>
        {shopList.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select value={type} onChange={(e) => apply({ type: e.target.value })} className="sm:w-44">
        <option value="All">All statuses</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
      </Select>
      {hasFilters && (
        <Button variant="ghost" onClick={() => router.push("/admin/inventory")}>
          Clear
        </Button>
      )}
    </div>
  );
}
