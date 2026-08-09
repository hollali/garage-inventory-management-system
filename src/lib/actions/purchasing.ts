"use server";

import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  inventoryItems,
  purchaseOrderItems,
  purchaseOrders,
  stockMovements,
  suppliers,
} from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { logActivity } from "@/lib/activity";

const toCents = (dollars: number) => Math.round(dollars * 100);

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  contactName: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z
    .union([z.literal(""), z.string().trim().email("Enter a valid email.")])
    .optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function createSupplier(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    email: formData.get("email") ?? undefined,
    address: formData.get("address") ?? undefined,
    notes: formData.get("notes") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const data = parsed.data;

  const [supplier] = await db
    .insert(suppliers)
    .values({
      name: data.name,
      contactName: data.contactName || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      notes: data.notes || null,
    })
    .returning({ id: suppliers.id });

  if (!supplier) return { error: "Failed to create supplier." };

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "supplier.create",
    shopId: null,
    entityType: "supplier",
    entityId: supplier.id,
    metadata: { name: data.name },
  });

  revalidatePath("/admin/suppliers");
  return { ok: true };
}

export async function deleteSupplier(formData: FormData) {
  const admin = await requireAdmin();

  const supplierId = String(formData.get("supplierId") ?? "");
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);
  if (!supplier) return { error: "Supplier not found." };

  await db.delete(suppliers).where(eq(suppliers.id, supplier.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "supplier.delete",
    shopId: null,
    entityType: "supplier",
    entityId: supplier.id,
    metadata: { name: supplier.name },
  });

  revalidatePath("/admin/suppliers");
  return { ok: true };
}

const purchaseOrderSchema = z.object({
  shopId: z
    .union([z.literal(""), z.string().min(1)])
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  supplierId: z.string().min(1, "Supplier is required."),
  notes: z.string().trim().max(1000).optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().positive("Quantity must be at least 1."),
        unitCost: z.number().min(0, "Unit cost cannot be negative."),
      }),
    )
    .min(1, "Add at least one line to the order."),
});

export type PurchaseOrderState = { ok?: boolean; error?: string; id?: string } | undefined;

export async function createPurchaseOrder(
  prevState: PurchaseOrderState,
  formData: FormData,
): Promise<PurchaseOrderState> {
  const admin = await requireAdmin();

  let parsed;
  try {
    parsed = purchaseOrderSchema.safeParse({
      shopId: formData.get("shopId") ?? "",
      supplierId: formData.get("supplierId") ?? "",
      notes: formData.get("notes") ?? undefined,
      lines: JSON.parse(String(formData.get("lines") ?? "[]")),
    });
  } catch {
    return { error: "Invalid order data." };
  }

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const { shopId, supplierId, notes, lines } = parsed.data;

  const [supplier] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);
  if (!supplier) return { error: "Selected supplier not found." };

  try {
    const result = await db.transaction(async (tx) => {
      const items = await tx
        .select()
        .from(inventoryItems)
        .where(inArray(inventoryItems.id, lines.map((l) => l.itemId)));
      const itemMap = new Map(items.map((i) => [i.id, i]));

      for (const line of lines) {
        if (!itemMap.has(line.itemId)) {
          throw new Error("A selected item no longer exists.");
        }
      }

      const totalCents = lines.reduce(
        (sum, line) => sum + toCents(line.unitCost) * line.quantity,
        0,
      );

      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          shopId,
          supplierId,
          status: "draft",
          totalCents,
          notes: notes || null,
          createdBy: admin.id,
        })
        .returning({ id: purchaseOrders.id });

      if (!po) throw new Error("Failed to create purchase order.");

      await tx.insert(purchaseOrderItems).values(
        lines.map((line) => ({
          purchaseOrderId: po.id,
          itemId: line.itemId,
          itemName: itemMap.get(line.itemId)!.name,
          quantityOrdered: line.quantity,
          quantityReceived: 0,
          unitCostCents: toCents(line.unitCost),
        })),
      );

      return { id: po.id, totalCents, itemCount: lines.length };
    });

    await logActivity({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: "admin",
      action: "purchaseOrder.create",
      shopId,
      entityType: "purchaseOrder",
      entityId: result.id,
      metadata: {
        totalCents: result.totalCents,
        itemCount: result.itemCount,
        supplierId,
      },
    });

    revalidatePath("/admin/purchase-orders");
    return { ok: true, id: result.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create purchase order.";
    return { error: message };
  }
}

export async function receivePurchaseOrder(formData: FormData) {
  const admin = await requireAdmin();

  const poId = String(formData.get("poId") ?? "");
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, poId))
    .limit(1);
  if (!po) return { error: "Purchase order not found." };
  if (po.status !== "draft") {
    return { error: "Only draft purchase orders can be received." };
  }

  const lineItems = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

  try {
    const result = await db.transaction(async (tx) => {
      for (const line of lineItems) {
        if (!line.itemId) {
          throw new Error("line item no longer exists");
        }
        const [item] = await tx
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, line.itemId))
          .limit(1);
        if (!item) {
          throw new Error("line item no longer exists");
        }

        const receivedQuantity = line.quantityOrdered;

        await tx
          .update(inventoryItems)
          .set({
            quantity: item.quantity + receivedQuantity,
            costCents: line.unitCostCents,
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, item.id));

        await tx.insert(stockMovements).values({
          itemId: item.id,
          shopId: po.shopId,
          userId: admin.id,
          type: "in",
          reason: "restock",
          quantity: receivedQuantity,
          note: `PO ${po.id}`,
        });

        await tx
          .update(purchaseOrderItems)
          .set({ quantityReceived: line.quantityOrdered })
          .where(eq(purchaseOrderItems.id, line.id));
      }

      await tx
        .update(purchaseOrders)
        .set({ status: "received", receivedAt: new Date() })
        .where(eq(purchaseOrders.id, po.id));

      return { itemCount: lineItems.length };
    });

    await logActivity({
      actorId: admin.id,
      actorName: admin.name,
      actorRole: "admin",
      action: "purchaseOrder.receive",
      shopId: po.shopId,
      entityType: "purchaseOrder",
      entityId: po.id,
      metadata: { itemCount: result.itemCount, totalCents: po.totalCents },
    });

    revalidatePath("/admin/purchase-orders");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to receive purchase order.";
    return { error: message };
  }
}

export async function cancelPurchaseOrder(formData: FormData) {
  const admin = await requireAdmin();

  const poId = String(formData.get("poId") ?? "");
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, poId))
    .limit(1);
  if (!po) return { error: "Purchase order not found." };
  if (po.status !== "draft") {
    return { error: "Only draft purchase orders can be cancelled." };
  }

  await db
    .update(purchaseOrders)
    .set({ status: "cancelled" })
    .where(eq(purchaseOrders.id, po.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "purchaseOrder.cancel",
    shopId: po.shopId,
    entityType: "purchaseOrder",
    entityId: po.id,
    metadata: { totalCents: po.totalCents },
  });

  revalidatePath("/admin/purchase-orders");
  return { ok: true };
}
