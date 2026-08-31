import { BrandMark } from "@/components/layout/sidebar";
import { getSiteSettings } from "@/lib/queries/settings";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark size="md" logoUrl={settings.logoUrl} brandName={settings.brandName} />
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {settings.brandName}
          </h1>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm sm:p-8 dark:border-zinc-800">
          {children}
        </div>
      </div>
    </div>
  );
}
