"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";

export function SalesFilter({ base = "/shop/sales" }: { base?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  function apply(next: { q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q) params.set("q", next.q);
    else params.delete("q");
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `${base}?${qs}` : base);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        defaultValue={q}
        placeholder="Search customer, contact, amount…"
        className="sm:max-w-64"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply({ q: (e.target as HTMLInputElement).value });
          }
        }}
        onBlur={(e) => apply({ q: e.target.value })}
      />
      {q && (
        <Button variant="ghost" onClick={() => apply({ q: "" })}>
          Clear
        </Button>
      )}
    </div>
  );
}
