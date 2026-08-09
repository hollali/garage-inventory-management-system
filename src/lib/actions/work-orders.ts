"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  inventoryItems,
  stockMovements,
  workOrderItems,
  workOrders,
} from "@/db/schema";
import {
  getShopForAttendant,
  requireAttendant,
  requireAttendantShop,
  requireUser,
} from "@/lib/dal";
import { logActivity } from "@/lib/activity";

function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export type WorkOrderActionState = { ok?: boolean; error?: string } | undefined;

const workOrderFieldsSchema = z.object({
  vehicleReg: z.string().trim().max(50).optional(),
  customerName: z.string().trim().max(200).optional(),
  customerContact: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  labour: z.coerce.number().min(0, "Labour cannot be negative."),
});

const addPartSchema = z.object({
  workOrderId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1."),
});

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
});

type Actor = {
  user: { id: string; name: string; role: "admin" | "attendant" };
  shopId: string | null;
};

async function resolveActor(): Promise<Actor> {
  const session = await requireUser();
  const user = { id: session.id, name: session.name ?? "", role: session.role };
  if (user.role === "admin") return { user, shopId: null };
  const shop = await getShopForAttendant(user.id);
  return { user, shopId: shop?.id ?? null };
}

export async function createWorkOrder(
  formData: FormData,
): Promise<WorkOrderActionState> {
  const user = await requireAttendant();
  const shop = await requireAttendantShop();

  const parsed = workOrderFieldsSchema.safeParse({
    vehicleReg: formData.get("vehicleReg"),
    customerName: formData.get("customerName"),
    customerContact: formData.get("customerContact"),
    notes: formData.get("notes"),
    labour: formData.get("labour"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const data = parsed.data;
  const [workOrder] = await db
    .insert(workOrders)
    .values({
      shopId: shop.id,
      vehicleReg: data.vehicleReg || null,
      customerName: data.customerName || null,
      customerContact: data.customerContact || null,
      notes: data.notes || null,
      labourCents: toCents(data.labour),
      status: "open",
      createdBy: user.id,
    })
    .returning({ id: workOrders.id });

  if (!workOrder) return { error: "Failed to create work order." };

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    actorRole: "attendant",
    action: "workOrder.create",
    shopId: shop.id,
    entityType: "workOrder",
    entityId: workOrder.id,
    metadata: {
      vehicleReg: data.vehicleReg || null,
      customerName: data.customerName || null,
    },
  });

  revalidatePath("/shop/work-orders");
  revalidatePath("/admin/work-orders");
  return { ok: true };
}

export async function updateWorkOrder(
  formData: FormData,
): Promise<WorkOrderActionState> {
  const { user, shopId } = await resolveActor();
  const id = String(formData.get("id") ?? "");

  const parsed = workOrderFieldsSchema.safeParse({
    vehicleReg: formData.get("vehicleReg"),
    customerName: formData.get("customerName"),
    customerContact: formData.get("customerContact"),
    notes: formData.get("notes"),
    labour: formData.get("labour"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }
  if (!id) return { error: "Missing work order id." };

  const [workOrder] = await db
    .select()
    .from(workOrders)
    .where(eq(workOrders.id, id))
    .limit(1);
  if (!workOrder) return { error: "Work order not found." };
  if (user.role === "attendant" && (!shopId || workOrder.shopId !== shopId)) {
    return { error: "Work order not found." };
  }
  if (workOrder.status === "completed" || workOrder.status === "cancelled") {
    return { error: "Completed or cancelled work orders cannot be edited." };
  }

  const data = parsed.data;
  await db
    .update(workOrders)
    .set({
      vehicleReg: data.vehicleReg || null,
      customerName: data.customerName || null,
      customerContact: data.customerContact || null,
      notes: data.notes || null,
      labourCents: toCents(data.labour),
    })
    .where(eq(workOrders.id, workOrder.id));

  await logActivity({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.role,
    action: "workOrder.update",
    shopId: workOrder.shopId,
    entityType: "workOrder",
    entityId: workOrder.id,
    metadata: { labourCents: toCents(data.labour) },
  });

  revalidatePath("/shop/work-orders");
  revalidatePath("/admin/work-orders");
  return { ok: true };
}

export async function addWorkOrderPart(
  formData: FormData,
): Promise<WorkOrderActionState> {
  const user = await requireAttendant();
  const shop = await requireAttendantShop();

  const parsed = addPartSchema.safeParse({
    workOrderId: formData.get("workOrderId"),
    itemId: formData.get("itemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const { workOrderId, itemId, quantity } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [workOrder] = await tx
        .select()
        .from(workOrders)
        .where(and(eq(workOrders.id, workOrderId), eq(workOrders.shopId, shop.id)))
        .limit(1);
      if (!workOrder) throw new Error("Work order not found.");
      if (workOrder.status === "completed" || workOrder.status === "cancelled") {
        throw new Error("Completed or cancelled work orders can't accept new parts.");
      }

      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.shopId, shop.id)))
        .limit(1);
      if (!item) throw new Error("Item not found in this shop.");
      if (item.quantity < quantity) {
        throw new Error(`Insufficient stock for "${item.name}". Only ${item.quantity} on hand.`);
      }

      await tx.insert(workOrderItems).values({
        workOrderId: workOrder.id,
        shopId: shop.id,
        itemId: item.id,
        itemName: item.name,
        quantity,
        unitPriceCents: item.unitPriceCents,
      });

      await tx
        .update(inventoryItems)
        .set({ quantity: item.quantity - quantity, updatedAt: new Date() })
        .where(eq(inventoryItems.id, item.id));

      await tx.insert(stockMovements).values({
        itemId: item.id,
        shopId: shop.id,
        userId: user.id,
        type: "out",
        reason: "sale",
        quantity,
        note: `Work order ${workOrder.id}`,
      });

      await tx
        .update(workOrders)
        .set({
          partsTotalCents: workOrder.partsTotalCents + item.unitPriceCents * quantity,
        })
        .where(eq(workOrders.id, workOrder.id));

      return { workOrderId: workOrder.id, itemName: item.name, quantity };
    });

    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: "attendant",
      action: "workOrder.part",
      shopId: shop.id,
      entityType: "workOrder",
      entityId: result.workOrderId,
      metadata: { itemName: result.itemName, quantity: result.quantity },
    });

    revalidatePath("/shop/work-orders");
    revalidatePath("/shop/items");
    revalidatePath("/admin/work-orders");
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to add part." };
  }
}

export async function setWorkOrderStatus(
  formData: FormData,
): Promise<WorkOrderActionState> {
  const { user, shopId } = await resolveActor();

  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const { id, status } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [workOrder] = await tx
        .select()
        .from(workOrders)
        .where(eq(workOrders.id, id))
        .limit(1);
      if (!workOrder) throw new Error("Work order not found.");
      if (user.role === "attendant" && (!shopId || workOrder.shopId !== shopId)) {
        throw new Error("Work order not found.");
      }
      if (workOrder.status === "cancelled") {
        throw new Error("Cancelled work orders can't change status.");
      }
      if (workOrder.status === "completed" && status === "completed") {
        return workOrder;
      }

      await tx
        .update(workOrders)
        .set({
          status,
          completedAt: status === "completed" ? new Date() : null,
        })
        .where(eq(workOrders.id, workOrder.id));

      return workOrder;
    });

    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "workOrder.status",
      shopId: result.shopId,
      entityType: "workOrder",
      entityId: id,
      metadata: { from: result.status, to: status },
    });

    revalidatePath("/shop/work-orders");
    revalidatePath("/admin/work-orders");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update status.",
    };
  }
}
