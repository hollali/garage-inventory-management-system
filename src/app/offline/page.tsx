import { Wrench } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/queries/settings";

export const dynamic = "force-dynamic";

export default async function OfflinePage() {
  const settings = await getSiteSettings();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-zinc-900 text-zinc-50 shadow-sm dark:bg-zinc-100 dark:text-zinc-900">
        {settings.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.logoUrl}
            alt={settings.brandName}
            className="size-full object-contain"
          />
        ) : (
          <Wrench className="size-6" aria-hidden />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          You&apos;re offline
        </h1>
        <p className="max-w-sm text-sm text-muted">
          You&apos;re not connected to the internet. Check your connection and try
          again.
        </p>
      </div>
      <ButtonLink href="/">Go to dashboard</ButtonLink>
    </div>
  );
}
