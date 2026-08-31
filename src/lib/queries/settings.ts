import "server-only";

import { db } from "@/db";
import { siteSettings } from "@/db/schema";

export type SiteSettings = {
  id: string;
  logoUrl: string | null;
  brandName: string;
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const [row] = await db.select().from(siteSettings).limit(1);
  if (row) {
    return {
      id: row.id,
      logoUrl: row.logoUrl,
      brandName: row.brandName,
    };
  }

  const [created] = await db
    .insert(siteSettings)
    .values({})
    .returning({ id: siteSettings.id, logoUrl: siteSettings.logoUrl, brandName: siteSettings.brandName });
  return {
    id: created.id,
    logoUrl: created.logoUrl,
    brandName: created.brandName,
  };
}
