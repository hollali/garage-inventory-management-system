"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inventoryItems, shops, stockMovements } from "@/db/schema";
import { requireAttendant } from "@/lib/dal";
import { logActivity } from "@/lib/activity";
import { resolveSku } from "@/lib/sku";

export async function getAttendantShopId(): Promise<string | null> {
  const user = await requireAttendant();
  const [shop] = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.assignedAttendantId, user.id))
    .limit(1);
  return shop?.id ?? null;
}

const itemSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  category: z.string().trim().min(1, "Category is required."),
  sku: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative."),
  cost: z.coerce.number().min(0).default(0),
  barcode: z.string().trim().max(100).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  unitName: z.string().trim().max(50).default("piece"),
  itemsPerUnit: z.coerce.number().int().min(1).default(1),
  lowStockThreshold: z.coerce.number().int().min(0),
  quantity: z.coerce.number().int().min(0),
});

function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export async function createItem(formData: FormData) {
  const user = await requireAttendant();
  const shopId = await getAttendantShopId();
  if (!shopId) return { error: "No shop is assigned to your account." };

  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    sku: formData.get("sku"),
    description: formData.get("description"),
    unitPrice: formData.get("unitPrice"),
    cost: formData.get("cost") ?? undefined,
    barcode: formData.get("barcode") ?? undefined,
    imageUrl: formData.get("imageUrl") ?? undefined,
    unitName: formData.get("unitName") ?? undefined,
    itemsPerUnit: formData.get("itemsPerUnit") ?? undefined,
    lowStockThreshold: formData.get("lowStockThreshold"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const data = parsed.data;
  const initialQuantity = data.quantity ?? 0;
  const sku = await resolveSku(data.sku, data.category);

  const [item] = await db
    .insert(inventoryItems)
    .values({
      shopId,
      name: data.name,
      category: data.category,
      sku,
      description: data.description || null,
      unitPriceCents: toCents(data.unitPrice),
      costCents: toCents(data.cost),
      barcode: data.barcode || null,
      imageUrl: data.imageUrl || null,
      unitName: data.unitName,
      itemsPerUnit: data.itemsPerUnit,
      lowStockThreshold: data.lowStockThreshold,
      quantity: initialQuantity,
    })
    .returning({ id: inventoryItems.id });

  if (!item) return { error: "Failed to create item." };

  if (initialQuantity > 0) {
    await db.insert(stockMovements).values({
      itemId: item.id,
      shopId,
      userId: user.id,
      type: "in",
      reason: "adjustment",
      quantity: initialQuantity,
      note: "Initial stock",
    });
  }

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    actorRole: "attendant",
    action: "item.create",
    shopId,
    entityType: "item",
    entityId: item.id,
    metadata: { name: data.name },
  });

  revalidatePath("/shop");
  revalidatePath("/shop/items");
  return { ok: true };
}

export async function updateItem(formData: FormData) {
  const user = await requireAttendant();
  const shopId = await getAttendantShopId();
  if (!shopId) return { error: "No shop is assigned to your account." };

  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    sku: formData.get("sku"),
    description: formData.get("description"),
    unitPrice: formData.get("unitPrice"),
    cost: formData.get("cost") ?? undefined,
    barcode: formData.get("barcode") ?? undefined,
    imageUrl: formData.get("imageUrl") ?? undefined,
    unitName: formData.get("unitName") ?? undefined,
    itemsPerUnit: formData.get("itemsPerUnit") ?? undefined,
    lowStockThreshold: formData.get("lowStockThreshold"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const id = String(formData.get("id") ?? "");
  const [existing] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.shopId, shopId)))
    .limit(1);

  if (!existing) return { error: "Item not found." };

  const data = parsed.data;
  const newQuantity = data.quantity ?? 0;
  const sku = await resolveSku(data.sku, data.category, existing.sku);

  await db
    .update(inventoryItems)
    .set({
      name: data.name,
      category: data.category,
      sku,
      description: data.description || null,
      unitPriceCents: toCents(data.unitPrice),
      costCents: toCents(data.cost),
      barcode: data.barcode || null,
      imageUrl: data.imageUrl || null,
      unitName: data.unitName,
      itemsPerUnit: data.itemsPerUnit,
      lowStockThreshold: data.lowStockThreshold,
      quantity: newQuantity,
      updatedAt: new Date(),
    })
    .where(eq(inventoryItems.id, existing.id));

  const diff = newQuantity - existing.quantity;
  if (diff !== 0) {
    await db.insert(stockMovements).values({
      itemId: existing.id,
      shopId,
      userId: user.id,
      type: diff > 0 ? "in" : "out",
      reason: "adjustment",
      quantity: Math.abs(diff),
      note: "Quantity adjusted while editing item",
    });
  }

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    actorRole: "attendant",
    action: "item.update",
    shopId,
    entityType: "item",
    entityId: existing.id,
    metadata: { name: data.name, quantityDelta: diff },
  });

  revalidatePath("/shop");
  revalidatePath("/shop/items");
  return { ok: true };
}

export async function deleteItem(formData: FormData) {
  const user = await requireAttendant();
  const shopId = await getAttendantShopId();
  if (!shopId) return { error: "No shop is assigned to your account." };

  const id = String(formData.get("id") ?? "");
  const [existing] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, id), eq(inventoryItems.shopId, shopId)))
    .limit(1);

  if (!existing) return { error: "Item not found." };

  await db.delete(inventoryItems).where(eq(inventoryItems.id, existing.id));

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    actorRole: "attendant",
    action: "item.delete",
    shopId,
    entityType: "item",
    entityId: existing.id,
    metadata: { name: existing.name },
  });

  revalidatePath("/shop");
  revalidatePath("/shop/items");
  return { ok: true };
}

const stockSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["in", "out"]),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1."),
  reason: z.enum(["restock", "sale", "damage", "transfer", "adjustment", "return"]),
  note: z.string().trim().max(500).optional(),
});

export async function adjustStock(formData: FormData) {
  const user = await requireAttendant();
  const shopId = await getAttendantShopId();
  if (!shopId) return { error: "No shop is assigned to your account." };

  const parsed = stockSchema.safeParse({
    itemId: formData.get("itemId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const { itemId, type, quantity, reason, note } = parsed.data;

  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.shopId, shopId)))
    .limit(1);

  if (!item) return { error: "Item not found." };

  if (type === "out" && quantity > item.quantity) {
    return {
      error: `Insufficient stock. Only ${item.quantity} on hand.`,
    };
  }

  const newQuantity = type === "in" ? item.quantity + quantity : item.quantity - quantity;

  await db
    .update(inventoryItems)
    .set({ quantity: newQuantity, updatedAt: new Date() })
    .where(eq(inventoryItems.id, item.id));

  await db.insert(stockMovements).values({
    itemId: item.id,
    shopId,
    userId: user.id,
    type,
    reason,
    quantity,
    note: note || null,
  });

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    actorRole: "attendant",
    action: type === "in" ? "stock.in" : "stock.out",
    shopId,
    entityType: "item",
    entityId: item.id,
    metadata: { name: item.name, quantity, reason },
  });

  revalidatePath("/shop");
  revalidatePath("/shop/items");
  revalidatePath("/shop/items/[id]");

  return { ok: true };
}


