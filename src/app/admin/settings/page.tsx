import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSiteSettings } from "@/lib/queries/settings";
import { TwoFactor } from "@/components/settings/two-factor";
import { BrandingSettings } from "@/components/settings/branding";

export default async function AdminSettingsPage() {
  const user = await requireAdmin();

  const [rows, settings] = await Promise.all([
    db
      .select({ totpEnabled: users.totpEnabled })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
    getSiteSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Settings
        </h1>
        <p className="text-sm text-muted">
          Manage branding, security, and preferences.
        </p>
      </div>

      <BrandingSettings
        initialBrandName={settings.brandName}
        initialLogoUrl={settings.logoUrl}
      />

      <TwoFactor initialEnabled={rows?.[0]?.totpEnabled ?? false} />
    </div>
  );
}
