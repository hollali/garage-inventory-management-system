import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/db";
import { users } from "@/db/schema";
import { TwoFactor } from "@/components/settings/two-factor";

export default async function AdminSettingsPage() {
  const user = await requireAdmin();

  const [row] = await db
    .select({ totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return <TwoFactor initialEnabled={row?.totpEnabled ?? false} />;
}
