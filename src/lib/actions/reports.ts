"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { logActivity } from "@/lib/activity";
import { getReorderSuggestions } from "@/lib/queries/reports";

const appName = process.env.APP_NAME ?? "Garage Inventory";
const appUrl = process.env.APP_URL ?? "http://localhost:3000";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendLowStockAlert(): Promise<{ ok?: boolean; error?: string; sent?: number }> {
  const admin = await requireAdmin();

  const items = await getReorderSuggestions();
  if (items.length === 0) {
    return { error: "No low stock items." };
  }

  const adminUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, "admin"));

  const recipients = adminUsers.filter((u) => u.email);
  const preview = items.slice(0, 20);

  const rowsHtml = preview
    .map(
      (it) =>
        `<li><strong>${escapeHtml(it.itemName)}</strong> (${escapeHtml(it.shopName ?? "Central")}) — ${it.quantity} on hand, threshold ${it.lowStockThreshold}, suggested order ${it.suggestedQuantity}</li>`,
    )
    .join("");

  let sent = 0;
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey && recipients.length > 0) {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM ?? "Garage Inventory <onboarding@resend.dev>";
    const html = `
      <p>${items.length} item${items.length === 1 ? "" : "s"} are below their low-stock threshold and need reordering:</p>
      <ul>${rowsHtml}</ul>
      ${items.length > preview.length ? `<p>…and ${items.length - preview.length} more.</p>` : ""}
      <p><a href="${appUrl}/admin/reports">View reorder suggestions</a></p>
    `;

    for (const recipient of recipients) {
      const res = await resend.emails.send({
        from,
        to: recipient.email,
        subject: `Low stock alert — ${items.length} item${items.length === 1 ? "" : "s"} need reordering`,
        html,
      });
      if (res.error) {
        console.error("Failed to send low stock alert", res.error);
      } else {
        sent += 1;
      }
    }
  } else {
    console.info(
      `\n[${appName}] Low stock alert for ${recipients.length} admin(s): ${items.length} item(s) below threshold\n` +
        preview
          .map(
            (it) =>
              `  - ${it.itemName} (${it.shopName ?? "Central"}): ${it.quantity} on hand, threshold ${it.lowStockThreshold}, suggested ${it.suggestedQuantity}`,
          )
          .join("\n") +
        `\n(Set RESEND_API_KEY to send real emails.)\n`,
    );
    sent = recipients.length;
  }

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: "admin",
    action: "report.lowStockAlert",
    shopId: null,
    entityType: "report",
    metadata: { count: items.length, recipients: recipients.length, sent },
  });

  revalidatePath("/admin/reports");
  return { ok: true, sent };
}
