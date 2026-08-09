import { db } from "@/db";
import { activityLog } from "@/db/schema";

type LogInput = {
  actorId?: string | null;
  actorName?: string | null;
  actorRole: "admin" | "attendant";
  action: string;
  shopId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logActivity(input: LogInput) {
  try {
    await db.insert(activityLog).values({
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? "Unknown",
      actorRole: input.actorRole,
      action: input.action,
      shopId: input.shopId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (error) {
    console.error("Failed to log activity", error);
  }
}
