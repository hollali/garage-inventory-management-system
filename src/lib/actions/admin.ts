"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inventoryItems, shops, stockMovements, users } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { logActivity } from "@/lib/activity";
import { resolveSku } from "@/lib/sku";

const shopSchema = z.object({
  name: z.string().trim().min(1, "Shop name is required."),
  location: z.string().trim().min(1, "Location is required."),
  description: z.string().trim().max(500).optional(),
  attendantId: z.string().optional(),
});

export async function createShop(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = shopSchema.safeParse({
    name: formData.get("name"),
    location: formData.get("location"),
    description: formData.get("description"),
    attendantId: formData.get("attendantId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const { name, location, description, attendantId } = parsed.data;

  if (attendantId) {
    const [attendant] = await db
      .select()
      .from(users)
      .where(eq(users.id, attendantId))
      .limit(1);
    if (!attendant || attendant.role !== "attendant") {
      return { error: "Selected user is not an attendant." };
    }
  }

  const [shop] = await db
    .insert(shops)
    .values({
      name,
      location,
      description: description || null,
      assignedAttendantId: attendantId ?? null,
    })
    .returning({ id: shops.id });

  if (!shop) return { error: "Failed to create shop." };

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "shop.create",
    shopId: shop.id,
    entityType: "shop",
    entityId: shop.id,
    metadata: { name, location },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/shops");
  return { ok: true };
}

export async function deleteShop(formData: FormData) {
  const admin = await requireAdmin();

  const shopId = String(formData.get("shopId") ?? "");
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  if (!shop) return { error: "Shop not found." };

  await db.delete(shops).where(eq(shops.id, shop.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "shop.delete",
    shopId: null,
    entityType: "shop",
    entityId: shop.id,
    metadata: { name: shop.name, location: shop.location },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/shops");
  return { ok: true };
}

export async function reassignAttendant(formData: FormData) {
  const admin = await requireAdmin();

  const shopId = String(formData.get("shopId") ?? "");
  const attendantId = String(formData.get("attendantId") ?? "") || null;

  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  if (!shop) return { error: "Shop not found." };

  if (attendantId) {
    const [attendant] = await db
      .select()
      .from(users)
      .where(eq(users.id, attendantId))
      .limit(1);
    if (!attendant || attendant.role !== "attendant" || !attendant.active) {
      return { error: "Selected user is not an active attendant." };
    }
    const [other] = await db
      .select()
      .from(shops)
      .where(eq(shops.assignedAttendantId, attendantId))
      .limit(1);
    if (other && other.id !== shop.id) {
      return { error: "That attendant is already assigned to another shop." };
    }
  }

  await db
    .update(shops)
    .set({ assignedAttendantId: attendantId })
    .where(eq(shops.id, shop.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "attendant.reassign",
    shopId: shop.id,
    entityType: "shop",
    entityId: shop.id,
    metadata: { shopName: shop.name, assignedAttendantId: attendantId },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/shops");
  revalidatePath("/admin/shops/[id]", "page");
}

const attendantSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().email("Enter a valid email.").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  shopId: z.string().optional(),
});

export async function createAttendant(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = attendantSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    shopId: formData.get("shopId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const { name, email, password, shopId } = parsed.data;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role: "attendant",
    })
    .returning({ id: users.id });

  if (!user) return { error: "Failed to create attendant." };

  if (shopId) {
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);
    if (shop) {
      await db
        .update(shops)
        .set({ assignedAttendantId: user.id })
        .where(eq(shops.id, shop.id));
    }
  }

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "attendant.create",
    shopId: shopId ?? null,
    entityType: "user",
    entityId: user.id,
    metadata: { name, email, shopId: shopId ?? null },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/shops");
  revalidatePath("/admin/attendants");
  return { ok: true };
}

export async function deactivateAttendant(formData: FormData) {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.role !== "attendant") return { error: "Attendant not found." };

  await db.update(users).set({ active: false }).where(eq(users.id, user.id));

  await db
    .update(shops)
    .set({ assignedAttendantId: null })
    .where(eq(shops.assignedAttendantId, user.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "attendant.deactivate",
    shopId: null,
    entityType: "user",
    entityId: user.id,
    metadata: { name: user.name, email: user.email },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/attendants");
  revalidatePath("/admin/shops");
}

export async function reactivateAttendant(formData: FormData) {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.role !== "attendant") return { error: "Attendant not found." };

  await db.update(users).set({ active: true }).where(eq(users.id, user.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "attendant.reactivate",
    shopId: null,
    entityType: "user",
    entityId: user.id,
    metadata: { name: user.name, email: user.email },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/attendants");
}

export async function deleteAttendant(formData: FormData) {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.role !== "attendant") return { error: "Attendant not found." };

  await db
    .update(shops)
    .set({ assignedAttendantId: null })
    .where(eq(shops.assignedAttendantId, user.id));

  await db.delete(users).where(eq(users.id, user.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "attendant.delete",
    shopId: null,
    entityType: "user",
    entityId: user.id,
    metadata: { name: user.name, email: user.email },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/attendants");
  revalidatePath("/admin/shops");
}

export async function getUnassignedAttendants() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      active: users.active,
    })
    .from(users)
    .leftJoin(shops, eq(shops.assignedAttendantId, users.id))
    .where(isNull(shops.id));
  return rows;
}

/* ---------- Inventory management ---------- */

const adminItemSchema = z.object({
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
  shopId: z.string().optional(),
});

const stockAdjustSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["in", "out"]),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1."),
  reason: z.enum(["restock", "sale", "damage", "transfer", "adjustment", "return"]),
  note: z.string().trim().max(500).optional(),
});

const transferSchema = z.object({
  fromItemId: z.string().min(1),
  toShopId: z.string(), // empty string => central pool
  quantity: z.coerce.number().int().positive("Quantity must be at least 1."),
});

function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function parseShopId(value: unknown): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s || null;
}

async function shopExists(shopId: string): Promise<boolean> {
  const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, shopId)).limit(1);
  return Boolean(shop);
}

export async function createAdminItem(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = adminItemSchema.safeParse({
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
    shopId: formData.get("shopId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const data = parsed.data;
  const shopId = parseShopId(data.shopId);
  if (shopId && !(await shopExists(shopId))) return { error: "Selected shop not found." };
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
      quantity: data.quantity,
    })
    .returning({ id: inventoryItems.id });

  if (!item) return { error: "Failed to create item." };

  if (data.quantity > 0) {
    await db.insert(stockMovements).values({
      itemId: item.id,
      shopId,
      userId: admin.id,
      type: "in",
      reason: "adjustment",
      quantity: data.quantity,
      note: "Initial stock",
    });
  }

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "item.create",
    shopId,
    entityType: "item",
    entityId: item.id,
    metadata: { name: data.name, quantity: data.quantity, shopId },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/shops/[id]", "page");
  return { ok: true, itemId: item.id };
}

export async function updateAdminItem(formData: FormData) {
  const admin = await requireAdmin();

  const itemId = String(formData.get("itemId") ?? "");
  const parsed = adminItemSchema.safeParse({
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
    shopId: formData.get("shopId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const [existing] = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.id, itemId))
    .limit(1);
  if (!existing) return { error: "Item not found." };

  const data = parsed.data;
  const shopId = parseShopId(data.shopId);
  if (shopId && !(await shopExists(shopId))) return { error: "Selected shop not found." };
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
      quantity: data.quantity,
      shopId,
      updatedAt: new Date(),
    })
    .where(eq(inventoryItems.id, existing.id));

  const diff = data.quantity - existing.quantity;
  if (diff !== 0) {
    await db.insert(stockMovements).values({
      itemId: existing.id,
      shopId: shopId ?? existing.shopId,
      userId: admin.id,
      type: diff > 0 ? "in" : "out",
      reason: "adjustment",
      quantity: Math.abs(diff),
      note: "Quantity adjusted while editing item",
    });
  }

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "item.update",
    shopId,
    entityType: "item",
    entityId: existing.id,
    metadata: { name: data.name, quantityDelta: diff, shopId },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/shops/[id]", "page");
  return { ok: true };
}

export async function deleteAdminItem(formData: FormData) {
  const admin = await requireAdmin();

  const itemId = String(formData.get("itemId") ?? "");
  const [existing] = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.id, itemId))
    .limit(1);
  if (!existing) return { error: "Item not found." };

  await db.delete(inventoryItems).where(eq(inventoryItems.id, existing.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "item.delete",
    shopId: existing.shopId,
    entityType: "item",
    entityId: existing.id,
    metadata: { name: existing.name },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/shops/[id]", "page");
  return { ok: true };
}

export async function adjustStockAdmin(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = stockAdjustSchema.safeParse({
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
    .where(eq(inventoryItems.id, itemId))
    .limit(1);
  if (!item) return { error: "Item not found." };
  if (type === "out" && quantity > item.quantity) {
    return { error: `Insufficient stock. Only ${item.quantity} on hand.` };
  }

  const newQuantity = type === "in" ? item.quantity + quantity : item.quantity - quantity;

  await db
    .update(inventoryItems)
    .set({ quantity: newQuantity, updatedAt: new Date() })
    .where(eq(inventoryItems.id, item.id));

  await db.insert(stockMovements).values({
    itemId: item.id,
    shopId: item.shopId,
    userId: admin.id,
    type,
    reason,
    quantity,
    note: note || null,
  });

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: type === "in" ? "stock.in" : "stock.out",
    shopId: item.shopId,
    entityType: "item",
    entityId: item.id,
    metadata: { name: item.name, quantity, reason },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/shops/[id]", "page");
  return { ok: true };
}

export async function transferStock(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = transferSchema.safeParse({
    fromItemId: formData.get("fromItemId"),
    toShopId: formData.get("toShopId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const { fromItemId, quantity } = parsed.data;
  const destShopId = parseShopId(parsed.data.toShopId);
  if (destShopId && !(await shopExists(destShopId))) return { error: "Destination shop not found." };

  try {
    const result = await db.transaction(async (tx) => {
      const [source] = await tx
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, fromItemId))
        .limit(1);
      if (!source) return { error: "Source item not found." };
      if (source.quantity < quantity) {
        return { error: `Insufficient stock. Only ${source.quantity} available.` };
      }
      if (destShopId && source.shopId === destShopId) {
        return { error: "Item is already in that shop." };
      }

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
          .set({ quantity: dest.quantity + quantity, updatedAt: new Date() })
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
            shopId: destShopId,
            quantity,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: inventoryItems.id });
        destId = created?.id ?? null;
      }

      await tx
        .update(inventoryItems)
        .set({ quantity: source.quantity - quantity, updatedAt: new Date() })
        .where(eq(inventoryItems.id, source.id));

      await tx.insert(stockMovements).values({
        itemId: source.id,
        shopId: source.shopId,
        userId: admin.id,
        type: "out",
        reason: "transfer",
        quantity,
        note: destShopId ? `Transferred to shop ${destShopId}` : "Transferred to central pool",
      });
      await tx.insert(stockMovements).values({
        itemId: destId ?? source.id,
        shopId: destShopId,
        userId: admin.id,
        type: "in",
        reason: "transfer",
        quantity,
        note: source.shopId ? `Transferred from shop ${source.shopId}` : "Transferred from central pool",
      });

      return { ok: true, sourceShopId: source.shopId, sourceName: source.name };
    });

    if (result?.error) return result;

    const isDistribute = result.sourceShopId === null;
    await logActivity({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: "admin",
      action: isDistribute ? "stock.distribute" : "stock.transfer",
      shopId: destShopId ?? null,
      entityType: "item",
      entityId: fromItemId,
      metadata: {
        name: result.sourceName,
        quantity,
        fromShop: result.sourceShopId ?? "Central",
        toShop: destShopId ?? "Central",
      },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/shops/[id]", "page");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Transfer failed" };
  }
}
