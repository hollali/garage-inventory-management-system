"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { actionLabel } from "@/lib/labels";
import { Select } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";

export function ActivityFilter({
  shops,
  actors,
  actions,
}: {
  shops: { id: string; name: string }[];
  actors: { id: string; name: string }[];
  actions: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const shopId = searchParams.get("shop") ?? "";
  const actorId = searchParams.get("actor") ?? "";
  const action = searchParams.get("action") ?? "";

  function apply(overrides: { shop?: string; actor?: string; action?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const s = overrides.shop ?? shopId;
    const a = overrides.actor ?? actorId;
    const ac = overrides.action ?? action;
    if (s) params.set("shop", s);
    else params.delete("shop");
    if (a) params.set("actor", a);
    else params.delete("actor");
    if (ac) params.set("action", ac);
    else params.delete("action");
    params.set("page", "1");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/admin/activity?${qs}` : "/admin/activity");
    });
  }

  const hasFilters = shopId || actorId || action;

  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
      aria-busy={isPending}
      style={{ opacity: isPending ? 0.6 : undefined }}
    >
      <Select
        aria-label="Filter by shop"
        value={shopId}
        disabled={isPending}
        onChange={(e) => apply({ shop: e.target.value })}
        className="w-full min-w-0"
      >
        <option value="">All shops</option>
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Filter by person"
        value={actorId}
        disabled={isPending}
        onChange={(e) => apply({ actor: e.target.value })}
        className="w-full min-w-0"
      >
        <option value="">All people</option>
        {actors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Filter by action"
        value={action}
        disabled={isPending}
        onChange={(e) => apply({ action: e.target.value })}
        className="w-full min-w-0"
      >
        <option value="">All actions</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {actionLabel(a)}
          </option>
        ))}
      </Select>
      {hasFilters && (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => apply({ shop: "", actor: "", action: "" })}
          className="w-full sm:w-auto xl:self-end"
        >
          Clear
        </Button>
      )}
    </div>
  );
}
