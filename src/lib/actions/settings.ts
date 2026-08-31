"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { logActivity } from "@/lib/activity";

const brandSchema = z.object({
  brandName: z.string().trim().min(1, "Brand name is required.").max(60),
});

export type BrandState = { ok?: boolean; error?: string } | undefined;

export async function updateBrandName(formData: FormData): Promise<BrandState> {
  const admin = await requireAdmin();

  const parsed = brandSchema.safeParse({ brandName: formData.get("brandName") });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  try {
    const [existing] = await db.select().from(siteSettings).limit(1);
    if (existing) {
      await db
        .update(siteSettings)
        .set({ brandName: parsed.data.brandName, updatedAt: new Date() })
        .where(eq(siteSettings.id, existing.id));
    } else {
      await db.insert(siteSettings).values({ brandName: parsed.data.brandName });
    }

    await logActivity({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: "admin",
      action: "settings.brand.update",
      entityType: "settings",
      metadata: { brandName: parsed.data.brandName },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/shop", "layout");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update brand name." };
  }
}
