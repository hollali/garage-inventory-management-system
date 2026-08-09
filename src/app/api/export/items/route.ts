import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { inventoryItems, shops } from "@/db/schema";

export const runtime = "nodejs";

function csvField(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  if (session.user.role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const rows = await db
    .select({
      name: inventoryItems.name,
      category: inventoryItems.category,
      sku: inventoryItems.sku,
      barcode: inventoryItems.barcode,
      quantity: inventoryItems.quantity,
      unitPriceCents: inventoryItems.unitPriceCents,
      costCents: inventoryItems.costCents,
      lowStockThreshold: inventoryItems.lowStockThreshold,
      shopName: shops.name,
    })
    .from(inventoryItems)
    .leftJoin(shops, eq(shops.id, inventoryItems.shopId))
    .orderBy(inventoryItems.name);

  const header = [
    "name",
    "category",
    "sku",
    "barcode",
    "quantity",
    "unitPrice",
    "cost",
    "lowStockThreshold",
    "shopName",
  ];

  const csv = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.name,
        r.category,
        r.sku,
        r.barcode,
        r.quantity,
        (r.unitPriceCents / 100).toFixed(2),
        (r.costCents / 100).toFixed(2),
        r.lowStockThreshold,
        r.shopName,
      ]
        .map(csvField)
        .join(","),
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inventory.csv"',
    },
  });
}
