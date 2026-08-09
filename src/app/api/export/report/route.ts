import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getInventoryMarginRows, getReorderSuggestions } from "@/lib/queries/reports";

function csvCell(value: string | number | null): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\r\n");
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (session.user.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const isReorder = url.searchParams.get("reorder") === "1";

  let csv: string;
  let filename: string;

  if (isReorder) {
    const items = await getReorderSuggestions();
    csv = toCsv(
      [
        "itemName",
        "shopName",
        "category",
        "quantity",
        "lowStockThreshold",
        "suggestedQuantity",
        "30DaySales",
        "unitPriceCents",
      ],
      items.map((it) => [
        it.itemName,
        it.shopName,
        it.category,
        it.quantity,
        it.lowStockThreshold,
        it.suggestedQuantity,
        it.sales30Day,
        it.unitPriceCents,
      ]),
    );
    filename = "reorder-suggestions.csv";
  } else {
    const rows = await getInventoryMarginRows();
    csv = toCsv(
      [
        "itemName",
        "shopName",
        "category",
        "quantity",
        "unitPriceCents",
        "costCents",
        "marginCents",
        "retailValueCents",
        "costValueCents",
      ],
      rows.map((r) => [
        r.itemName,
        r.shopName,
        r.category,
        r.quantity,
        r.unitPriceCents,
        r.costCents,
        r.marginCents,
        r.retailValueCents,
        r.costValueCents,
      ]),
    );
    filename = "inventory-margin-report.csv";
  }

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
