"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { setActiveShop } from "@/lib/actions/attendant";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function ActiveShopSelector({
  shops,
  activeShopId,
  className,
}: {
  shops: { id: string; name: string }[];
  activeShopId: string | null;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const active = shops.find((s) => s.id === activeShopId) ?? shops[0];
  const disabled = pending || shops.length < 2;

  function onChange(value: string) {
    if (!value || value === active?.id) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("shopId", value);
      const result = await setActiveShop(formData);
      if (result?.error) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      toast({ title: "Switched shop", description: active?.name });
      router.refresh();
    });
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Store className="size-4 shrink-0 text-muted" aria-hidden />
      <select
        value={active?.id ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Active shop"
        className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-200 hover:bg-surface focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-100 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10"
      >
        {shops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}