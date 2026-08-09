"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inventoryItems, shops, stockMovements, transferRequests } from "@/db/schema";
import { requireAdmin, requireAttendant, requireAttendantShop } from "@/lib/dal";
import { logActivity } from "@/lib/activity";

const requestSchema = z.object({
  itemId: z.string().min(1, "Select an item."),
  toShopId: z.string(),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1."),
  note: z.string().trim().max(500, "Note is too long.").optional(),
});

const requestIdSchema = z.object({
  requestId: z.string().min(1, "Request id is required."),
});

function parseRequestId(formData: FormData) {
  return requestIdSchema.safeParse({ requestId: formData.get("requestId") });
}

export async function requestTransfer(formData: FormData) {
  const user = await requireAttendant();
  const shop = await requireAttendantShop();

  const parsed = requestSchema.safeParse({
    itemId: formData.get("itemId"),
    toShopId: formData.get("toShopId"),
    quantity: formData.get("quantity"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const { itemId, toShopId, quantity, note } = parsed.data;
  const destShopId = toShopId && toShopId !== "central" ? toShopId : null;
  if (destShopId === shop.id) {
    return { error: "You cannot request stock from your own shop." };
  }
  if (destShopId) {
    const [destShop] = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.id, destShopId))
      .limit(1);
    if (!destShop) return { error: "Destination shop not found." };
  }

  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.shopId, shop.id)))
    .limit(1);
  if (!item) return { error: "Item not found in your shop." };
  if (quantity > item.quantity) {
    return { error: `Insufficient stock. Only ${item.quantity} available.` };
  }

  const [request] = await db
    .insert(transferRequests)
    .values({
      fromShopId: shop.id,
      toShopId: destShopId,
      itemId: item.id,
      itemName: item.name,
      quantity,
      status: "pending",
      note: note || null,
      requestedBy: user.id,
    })
    .returning({ id: transferRequests.id });

  if (!request) return { error: "Failed to create transfer request." };

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    actorRole: "attendant",
    action: "transfer.request",
    shopId: shop.id,
    entityType: "transfer",
    entityId: request.id,
    metadata: { itemName: item.name, quantity, toShopId: destShopId },
  });

  revalidatePath("/shop/transfers");
  revalidatePath("/admin/transfers");
  return { ok: true };
}

export async function approveTransfer(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = parseRequestId(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const requestId = parsed.data.requestId;

  const [request] = await db
    .select()
    .from(transferRequests)
    .where(eq(transferRequests.id, requestId))
    .limit(1);
  if (!request) return { error: "Transfer request not found." };
  if (request.status !== "pending") {
    return { error: "This request has already been processed." };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [source] = await tx
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, request.itemId))
        .limit(1);
      if (!source) return { error: "Source item not found." };
      if (request.quantity > source.quantity) {
        return { error: `Insufficient stock. Only ${source.quantity} available.` };
      }

      const destShopId = request.toShopId;

      const [dest] = destShopId
        ? await tx
            .select()
            .from(inventoryItems)
            .where(and(eq(inventoryItems.name, source.name), eq(inventoryItems.shopId, destShopId)))
            .limit(1)
        : await tx
            .select()
            .from(inventoryItems)
            .where(and(eq(inventoryItems.name, source.name), isNull(inventoryItems.shopId)))
            .limit(1);

      let destId: string | null = dest?.id ?? null;
      if (dest) {
        await tx
          .update(inventoryItems)
          .set({ quantity: dest.quantity + request.quantity, updatedAt: new Date() })
          .where(eq(inventoryItems.id, dest.id));
      } else {
        const [created] = await tx
          .insert(inventoryItems)
          .values({
            name: source.name,
            category: source.category,
            sku: source.sku,
            description: source.description,
            unitPriceCents: source.unitPriceCents,
            lowStockThreshold: source.lowStockThreshold,
            unitName: source.unitName,
            itemsPerUnit: source.itemsPerUnit,
            shopId: destShopId,
            quantity: request.quantity,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: inventoryItems.id });
        destId = created?.id ?? null;
      }

      await tx
        .update(inventoryItems)
        .set({ quantity: source.quantity - request.quantity, updatedAt: new Date() })
        .where(eq(inventoryItems.id, source.id));

      await tx.insert(stockMovements).values({
        itemId: source.id,
        shopId: source.shopId,
        userId: admin.id,
        type: "out",
        reason: "transfer",
        quantity: request.quantity,
        note: destShopId
          ? `Transfer request ${request.id} · to shop ${destShopId}`
          : `Transfer request ${request.id} · to central pool`,
      });
      await tx.insert(stockMovements).values({
        itemId: destId ?? source.id,
        shopId: destShopId,
        userId: admin.id,
        type: "in",
        reason: "transfer",
        quantity: request.quantity,
        note: `Transfer request ${request.id} · from shop ${request.fromShopId}`,
      });

      await tx
        .update(transferRequests)
        .set({ status: "completed", completedAt: new Date(), approvedBy: admin.id })
        .where(eq(transferRequests.id, request.id));

      return { ok: true, destShopId };
    });

    if (result?.error) return result;

    await logActivity({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: "admin",
      action: "transfer.approve",
      shopId: result.destShopId ?? null,
      entityType: "transfer",
      entityId: request.id,
      metadata: {
        itemName: request.itemName,
        quantity: request.quantity,
        fromShopId: request.fromShopId,
        toShopId: result.destShopId,
      },
    });

    revalidatePath("/admin/transfers");
    revalidatePath("/admin/inventory");
    revalidatePath("/shop/transfers");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to approve transfer." };
  }
}

export async function rejectTransfer(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = parseRequestId(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const [request] = await db
    .select()
    .from(transferRequests)
    .where(eq(transferRequests.id, parsed.data.requestId))
    .limit(1);
  if (!request) return { error: "Transfer request not found." };
  if (request.status !== "pending") {
    return { error: "This request has already been processed." };
  }

  await db
    .update(transferRequests)
    .set({ status: "rejected" })
    .where(eq(transferRequests.id, request.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "transfer.reject",
    shopId: request.fromShopId,
    entityType: "transfer",
    entityId: request.id,
    metadata: { itemName: request.itemName, quantity: request.quantity, toShopId: request.toShopId },
  });

  revalidatePath("/admin/transfers");
  revalidatePath("/shop/transfers");
  return { ok: true };
}

export async function cancelTransfer(formData: FormData) {
  const user = await requireAttendant();
  const shop = await requireAttendantShop();

  const parsed = parseRequestId(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const [request] = await db
    .select()
    .from(transferRequests)
    .where(
      and(
        eq(transferRequests.id, parsed.data.requestId),
        eq(transferRequests.fromShopId, shop.id),
      ),
    )
    .limit(1);
  if (!request) return { error: "Transfer request not found." };
  if (request.status !== "pending") {
    return { error: "This request has already been processed." };
  }

  await db
    .update(transferRequests)
    .set({
      status: "rejected",
      note: request.note
        ? `${request.note} (Cancelled by requester)`
        : "Cancelled by requester",
    })
    .where(eq(transferRequests.id, request.id));

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    actorRole: "attendant",
    action: "transfer.cancel",
    shopId: shop.id,
    entityType: "transfer",
    entityId: request.id,
    metadata: { itemName: request.itemName, quantity: request.quantity, toShopId: request.toShopId },
  });

  revalidatePath("/shop/transfers");
  revalidatePath("/admin/transfers");
  return { ok: true };
}
