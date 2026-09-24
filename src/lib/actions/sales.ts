"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  inventoryItems,
  saleItems,
  saleReturns,
  sales,
  stockMovements,
  type PaymentLeg,
} from "@/db/schema";
import { requireAttendant, requireAttendantShop } from "@/lib/dal";
import { logActivity } from "@/lib/activity";
import { getCustomerHistory, type CustomerHistoryRow } from "@/lib/queries/sales";

export type SaleState = { ok?: boolean; error?: string; saleId?: string } | undefined;

const saleSchema = z.object({
  lines: z
    .array(z.object({ itemId: z.string().min(1), quantity: z.number().int().positive() }))
    .min(1, "Add at least one item to the sale."),
  customerName: z.string().trim().max(200).optional(),
  customerContact: z.string().trim().max(200).optional(),
  vehicleReg: z.string().trim().max(200).optional(),
  paymentMethod: z.enum(["cash", "card", "mobile", "other"]).default("cash"),
  discount: z.coerce.number().min(0, "Discount cannot be negative.").default(0),
  paymentBreakdown: z
    .array(
      z.object({
        method: z.enum(["cash", "card", "mobile", "other"]),
        amountCents: z.number().int().positive("Payment amounts must be positive."),
      }),
    )
    .optional(),
});

export type PaymentBreakdownInput = { method: "cash" | "card" | "mobile" | "other"; amountCents: number }[];

function parsePaymentBreakdown(raw: FormDataEntryValue | null): PaymentLeg[] | null | undefined {
  if (raw === null || raw === "") return undefined;
  try {
    return JSON.parse(String(raw)) as PaymentLeg[];
  } catch {
    return null;
  }
}

function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export async function createSale(prevState: SaleState, formData: FormData): Promise<SaleState> {
  const user = await requireAttendant();
  const shop = await requireAttendantShop();

  let parsed;
  try {
    parsed = saleSchema.safeParse({
      lines: JSON.parse(String(formData.get("lines") ?? "[]")),
      customerName: formData.get("customerName"),
      customerContact: formData.get("customerContact"),
      vehicleReg: formData.get("vehicleReg"),
      paymentMethod: formData.get("paymentMethod") || "cash",
      discount: formData.get("discount") || "0",
      paymentBreakdown: parsePaymentBreakdown(formData.get("paymentBreakdown")),
    });
  } catch {
    return { error: "Invalid sale data." };
  }

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  if (parsed.data.paymentBreakdown === null) {
    return { error: "Invalid payment breakdown." };
  }

  const {
    lines,
    customerName,
    customerContact,
    vehicleReg,
    paymentMethod,
    discount,
    paymentBreakdown,
  } = parsed.data;
  const discountCents = toCents(discount);

  try {
    const result = await db.transaction(async (tx) => {
      let subtotalCents = 0;

      const saleRows = await tx
        .insert(sales)
        .values({
          shopId: shop.id,
          attendantId: user.id,
          customerName: customerName || null,
          customerContact: customerContact || null,
          vehicleReg: vehicleReg || null,
          paymentMethod,
          discountCents,
          status: "complete",
          totalCents: 0,
        })
        .returning({ id: sales.id });

      const saleId = saleRows[0].id;

      for (const line of lines) {
        const [item] = await tx
          .select()
          .from(inventoryItems)
          .where(and(eq(inventoryItems.id, line.itemId), eq(inventoryItems.shopId, shop.id)))
          .for("update")
          .limit(1);

        if (!item) {
          throw new Error("Item not found.");
        }
        const available = item.quantity - item.reservedQuantity;
        if (line.quantity > available) {
          throw new Error(
            `Insufficient stock for "${item.name}". Only ${Math.max(0, available)} available.`,
          );
        }

        subtotalCents += item.unitPriceCents * line.quantity;

        await tx.insert(saleItems).values({
          saleId,
          shopId: shop.id,
          itemId: item.id,
          itemName: item.name,
          unitPriceCents: item.unitPriceCents,
          quantity: line.quantity,
        });

        await tx
          .update(inventoryItems)
          .set({ quantity: item.quantity - line.quantity, updatedAt: new Date() })
          .where(eq(inventoryItems.id, item.id));

        await tx.insert(stockMovements).values({
          itemId: item.id,
          shopId: shop.id,
          userId: user.id,
          type: "out",
          reason: "sale",
          quantity: line.quantity,
          note: `Sale ${saleId}`,
        });
      }

      if (discountCents > subtotalCents) {
        throw new Error("Discount cannot exceed the subtotal.");
      }

      const totalCents = Math.max(0, subtotalCents - discountCents);

      let resolvedMethod: "cash" | "card" | "mobile" | "other" | "split" = paymentMethod;
      let storedBreakdown: PaymentLeg[] | null = null;

      if (paymentBreakdown && paymentBreakdown.length > 0) {
        const paidCents = paymentBreakdown.reduce((sum, leg) => sum + leg.amountCents, 0);
        if (paidCents !== totalCents) {
          throw new Error(
            `Payment amounts (${paidCents}¢) must equal the total (${totalCents}¢).`,
          );
        }
        const methods = new Set(paymentBreakdown.map((leg) => leg.method));
        resolvedMethod = methods.size > 1 ? "split" : (paymentBreakdown[0].method as typeof paymentMethod);
        storedBreakdown = paymentBreakdown.map((leg) => ({
          method: leg.method,
          amountCents: leg.amountCents,
        }));
      }

      await tx
        .update(sales)
        .set({
          totalCents,
          paymentMethod: resolvedMethod,
          paymentBreakdown: storedBreakdown,
        })
        .where(eq(sales.id, saleId));

      return { saleId, totalCents };
    });

    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: "attendant",
      action: "sale.create",
      shopId: shop.id,
      entityType: "sale",
      entityId: result.saleId,
      metadata: {
        totalCents: result.totalCents,
        itemCount: lines.length,
        paymentMethod,
        discountCents,
      },
    });

    revalidatePath("/shop");
    revalidatePath("/shop/sales");
    revalidatePath("/shop/items");

    return { ok: true, saleId: result.saleId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record sale.";
    return { error: message };
  }
}

const refundSchema = z.object({
  saleId: z.string().min(1, "Sale is required."),
  reason: z.string().trim().max(500).optional(),
});

export async function refundSale(formData: FormData) {
  const user = await requireAttendant();
  const shop = await requireAttendantShop();

  const parsed = refundSchema.safeParse({
    saleId: formData.get("saleId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }

  const { saleId, reason } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [sale] = await tx
        .select()
        .from(sales)
        .where(and(eq(sales.id, saleId), eq(sales.shopId, shop.id)))
        .limit(1);

      if (!sale) {
        throw new Error("Sale not found.");
      }
      if (sale.status !== "complete") {
        throw new Error("Only complete sales can be refunded.");
      }

      await tx.update(sales).set({ status: "refunded" }).where(eq(sales.id, sale.id));

      await tx.insert(saleReturns).values({
        saleId: sale.id,
        shopId: shop.id,
        attendantId: user.id,
        refundCents: sale.totalCents,
        reason: reason || null,
      });

      const lineItems = await tx
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, sale.id));

      for (const line of lineItems) {
        if (line.itemId) {
          const [item] = await tx
            .select()
            .from(inventoryItems)
            .where(eq(inventoryItems.id, line.itemId))
            .limit(1);

          if (item) {
            await tx
              .update(inventoryItems)
              .set({ quantity: item.quantity + line.quantity, updatedAt: new Date() })
              .where(eq(inventoryItems.id, item.id));
          }

          await tx.insert(stockMovements).values({
            itemId: line.itemId,
            shopId: shop.id,
            userId: user.id,
            type: "in",
            reason: "return",
            quantity: line.quantity,
            note: `Refund ${sale.id}`,
          });
        }
      }

      return { saleId: sale.id, refundCents: sale.totalCents };
    });

    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: "attendant",
      action: "sale.refund",
      shopId: shop.id,
      entityType: "sale",
      entityId: result.saleId,
      metadata: { refundCents: result.refundCents, reason: reason ?? null },
    });

    revalidatePath("/shop/sales");
    revalidatePath("/shop");
    revalidatePath("/shop/items");

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refund sale.";
    return { error: message };
  }
}

export type CustomerHistoryResult =
  | { history: CustomerHistoryRow[] }
  | { error: string };

export async function getCustomerHistoryAction(formData: FormData): Promise<CustomerHistoryResult> {
  const shop = await requireAttendantShop();
  const customerName = String(formData.get("customerName") ?? "").trim();
  if (!customerName) return { error: "Customer name is required." };
  const history = await getCustomerHistory(shop.id, customerName);
  return { history };
}
