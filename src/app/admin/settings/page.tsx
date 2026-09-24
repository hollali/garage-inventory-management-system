import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSiteSettings } from "@/lib/queries/settings";
import { TwoFactor } from "@/components/settings/two-factor";
import { BrandingSettings } from "@/components/settings/branding";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        title="Settings"
        description="Manage branding, security, and preferences."
      />

      <BrandingSettings
        initialBrandName={settings.brandName}
        initialLogoUrl={settings.logoUrl}
      />

      <TwoFactor initialEnabled={rows?.[0]?.totpEnabled ?? false} />
    </div>
  );
}
