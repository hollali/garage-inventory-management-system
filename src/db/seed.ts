import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  activityLog,
  inventoryItems,
  passwordResetTokens,
  saleItems,
  sales,
  shops,
  stockMovements,
  users,
} from "./schema";

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
const ATTENDANT_PASSWORD = process.env.SEED_ATTENDANT_PASSWORD ?? "attendant1234";

const shopSeeds = [
  {
    name: "Downtown Garage",
    location: "42 Main Street, Springfield",
    description: "Flagship location, full service and parts.",
    attendant: { name: "Jordan Smith", email: "jordan@garage.io" },
  },
  {
    name: "Northside Auto",
    location: "1200 North Avenue, Springfield",
    description: "Heavy equipment and fleet maintenance.",
    attendant: { name: "Alex Reyes", email: "alex@garage.io" },
  },
  {
    name: "Riverside Repairs",
    location: "8 River Road, Springfield",
    description: "Quick-service and diagnostics.",
    attendant: { name: "Sam Patel", email: "sam@garage.io" },
  },
  {
    name: "East Bay Motors",
    location: "77 Harbor Drive, Springfield",
    description: "Tires, batteries, and accessories.",
    attendant: { name: "Priya Nair", email: "priya@garage.io" },
  },
];

const inventoryTemplates: { name: string; category: string; price: number; qty: number; threshold: number; sku?: string }[] = [
  { name: "Impact wrench", category: "Power tools", price: 189.0, qty: 6, threshold: 2, sku: "PT-1001" },
  { name: "Socket set (10-24mm)", category: "Hand tools", price: 64.5, qty: 12, threshold: 3, sku: "HT-2002" },
  { name: "Car jack (2.5t)", category: "Equipment", price: 129.99, qty: 4, threshold: 2, sku: "EQ-3003" },
  { name: "OBD-II scanner", category: "Diagnostics", price: 89.0, qty: 3, threshold: 1, sku: "DG-4004" },
  { name: "Motor oil (5W-30, 5L)", category: "Consumables", price: 24.99, qty: 40, threshold: 10, sku: "CS-5005" },
  { name: "Brake pads (front set)", category: "Parts", price: 45.0, qty: 8, threshold: 4, sku: "PR-6006" },
  { name: "Wheel chocks", category: "Safety", price: 18.5, qty: 5, threshold: 2, sku: "SF-7007" },
  { name: "Battery charger", category: "Equipment", price: 59.0, qty: 2, threshold: 1, sku: "EQ-3004" },
];

async function main() {
  const existing = await db.select({ id: shops.id }).from(shops).limit(1);

  if (existing.length > 0 && process.argv.includes("--reset") === false) {
    console.log("Seed skipped: shops already exist. Run with --reset to wipe and reseed.");
    process.exit(0);
  }

  if (process.argv.includes("--reset")) {
    console.log("Resetting database…");
    await db.delete(passwordResetTokens);
    await db.delete(saleItems);
    await db.delete(sales);
    await db.delete(stockMovements);
    await db.delete(inventoryItems);
    await db.delete(activityLog);
    await db.delete(shops);
    await db.delete(users);
  }

  const adminHash = await hash(ADMIN_PASSWORD, 10);
  const attendantHash = await hash(ATTENDANT_PASSWORD, 10);

  const [admin] = await db
    .insert(users)
    .values({
      name: "Garage Owner",
      email: "admin@garage.io",
      passwordHash: adminHash,
      role: "admin",
    })
    .returning({ id: users.id });

  console.log(`Admin: admin@garage.io / ${ADMIN_PASSWORD}`);

  let shopIndex = 0;
  for (const seed of shopSeeds) {
    const [attendant] = await db
      .insert(users)
      .values({
        name: seed.attendant.name,
        email: seed.attendant.email,
        passwordHash: attendantHash,
        role: "attendant",
      })
      .returning({ id: users.id });

    const [shop] = await db
      .insert(shops)
      .values({
        name: seed.name,
        location: seed.location,
        description: seed.description,
        assignedAttendantId: attendant.id,
      })
      .returning({ id: shops.id });

    console.log(`Shop "${seed.name}" → ${seed.attendant.email} / ${ATTENDANT_PASSWORD}`);

    for (const template of inventoryTemplates) {
      const price = template.price * (1 + (shopIndex % 3) * 0.05);
      const qty = Math.max(template.qty - shopIndex, template.threshold >= 3 ? 1 : 0);
      await db.insert(inventoryItems).values({
        shopId: shop.id,
        name: template.name,
        category: template.category,
        sku: template.sku ? `${template.sku}-${shopIndex + 1}` : null,
        description: "Seeded demo item.",
        unitPriceCents: Math.round(price * 100),
        lowStockThreshold: template.threshold,
        quantity: qty,
      });
    }

    await db.insert(activityLog).values({
      actorId: admin.id,
      actorName: "Garage Owner",
      actorRole: "admin",
      action: "shop.create",
      shopId: shop.id,
      entityType: "shop",
      entityId: shop.id,
      metadata: { name: seed.name, location: seed.location },
    });

    shopIndex++;
  }

  const [s1] = await db.select().from(shops).limit(1);
  const s1Attendant = s1.assignedAttendantId;
  const [oilItem] = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.shopId, s1.id))
    .limit(1);

  if (s1 && s1Attendant && oilItem) {
    const saleTotal = oilItem.unitPriceCents * 3 + 45_00;
    const [sale] = await db
      .insert(sales)
      .values({
        shopId: s1.id,
        attendantId: s1Attendant,
        customerName: "Maya Chen",
        customerContact: "555-0100",
        totalCents: saleTotal,
      })
      .returning({ id: sales.id });

    await db.insert(saleItems).values({
      saleId: sale.id,
      shopId: s1.id,
      itemId: oilItem.id,
      itemName: oilItem.name,
      unitPriceCents: oilItem.unitPriceCents,
      quantity: 3,
    });

    await db.insert(stockMovements).values({
      itemId: oilItem.id,
      shopId: s1.id,
      userId: s1Attendant,
      type: "out",
      reason: "sale",
      quantity: 3,
      note: `Sale ${sale.id}`,
    });

    await db
      .update(inventoryItems)
      .set({ quantity: oilItem.quantity - 3 })
      .where(eq(inventoryItems.id, oilItem.id));
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
