"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { logActivity } from "@/lib/activity";
import { getReorderSuggestions } from "@/lib/queries/reports";
import { sendEmail, isEmailConfigured, logDevEmail, appUrl } from "@/lib/mail";

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

  if (recipients.length === 0) {
    return { error: "No admin email addresses to send to." };
  }

  const html = `
    <p>${items.length} item${items.length === 1 ? "" : "s"} are below their low-stock threshold and need reordering:</p>
    <ul>${rowsHtml}</ul>
    ${items.length > preview.length ? `<p>…and ${items.length - preview.length} more.</p>` : ""}
    <p><a href="${appUrl}/admin/reports">View reorder suggestions</a></p>
  `;

  const devSummary =
    `Low stock alert for ${recipients.length} admin(s): ${items.length} item(s) below threshold\n` +
    preview
      .map(
        (it) =>
          `  - ${it.itemName} (${it.shopName ?? "Central"}): ${it.quantity} on hand, threshold ${it.lowStockThreshold}, suggested ${it.suggestedQuantity}`,
      )
      .join("\n");

  if (isEmailConfigured()) {
    for (const recipient of recipients) {
      const res = await sendEmail(
        {
          to: recipient.email,
          subject: `Low stock alert — ${items.length} item${items.length === 1 ? "" : "s"} need reordering`,
          html,
        },
        devSummary,
      );
      if (res.sent) sent += 1;
    }
  } else {
    logDevEmail(devSummary);
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
