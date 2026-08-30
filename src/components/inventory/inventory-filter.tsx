"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { Input, Select } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";

export function InventoryFilter({
  categories,
  base = "/shop/items",
}: {
  categories: string[];
  base?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "All";
  const type = searchParams.get("type") ?? "All";
  const committedQuery = useRef(q);

  function apply(next: { q?: string; category?: string; type?: string }) {
    committedQuery.current = next.q ?? q;
    const params = new URLSearchParams(searchParams.toString());
    const newQ = next.q ?? q;
    const newCategory = next.category ?? category;
    const newType = next.type ?? type;
    if (newQ) params.set("q", newQ);
    else params.delete("q");
    if (newCategory && newCategory !== "All") params.set("category", newCategory);
    else params.delete("category");
    if (newType && newType !== "All") params.set("type", newType);
    else params.delete("type");
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `${base}?${qs}` : base);
  }

  const hasFilters =
    !!q || (category && category !== "All") || (type && type !== "All");

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Input
        key={q}
        defaultValue={q}
        placeholder="Search items…"
        className="sm:max-w-64"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply({ q: (e.target as HTMLInputElement).value });
          }
        }}
        onBlur={(e) => {
          const value = e.target.value;
          if (value !== committedQuery.current) apply({ q: value });
        }}
      />
      <Select
        value={category}
        onChange={(e) => apply({ category: e.target.value })}
        className="sm:w-48"
      >
        <option value="All">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Select
        value={type}
        onChange={(e) => apply({ type: e.target.value })}
        className="sm:w-44"
      >
        <option value="All">All statuses</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
      </Select>
      {hasFilters && (
        <Button variant="ghost" onClick={() => apply({ q: "", category: "All", type: "All" })}>
          Clear
        </Button>
      )}
    </div>
  );
}
