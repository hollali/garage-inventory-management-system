"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

  function apply(next: { q?: string; category?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const newQ = next.q ?? q;
    const newCategory = next.category ?? category;
    if (newQ) params.set("q", newQ);
    else params.delete("q");
    if (newCategory && newCategory !== "All") params.set("category", newCategory);
    else params.delete("category");
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `${base}?${qs}` : base);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        defaultValue={q}
        placeholder="Search items…"
        className="sm:max-w-64"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply({ q: (e.target as HTMLInputElement).value });
          }
        }}
        onBlur={(e) => apply({ q: e.target.value })}
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
      {(q || (category && category !== "All")) && (
        <Button variant="ghost" onClick={() => apply({ q: "", category: "All" })}>
          Clear
        </Button>
      )}
    </div>
  );
}
