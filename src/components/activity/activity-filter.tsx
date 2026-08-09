"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
    router.push(qs ? `/admin/activity?${qs}` : "/admin/activity");
  }

  const hasFilters = shopId || actorId || action;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select
        value={shopId}
        onChange={(e) => apply({ shop: e.target.value })}
        className="sm:w-48"
      >
        <option value="">All shops</option>
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select
        value={actorId}
        onChange={(e) => apply({ actor: e.target.value })}
        className="sm:w-52"
      >
        <option value="">All people</option>
        {actors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
      <Select
        value={action}
        onChange={(e) => apply({ action: e.target.value })}
        className="sm:w-56"
      >
        <option value="">All actions</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {actionLabel(a)}
          </option>
        ))}
      </Select>
      {hasFilters && (
        <Button variant="ghost" onClick={() => router.push("/admin/activity")}>
          Clear
        </Button>
      )}
    </div>
  );
}
