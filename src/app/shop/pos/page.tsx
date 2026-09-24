import type { Metadata } from "next";
import { requireAttendantShop } from "@/lib/dal";
import { getItemCategories, getShopInventory } from "@/lib/queries";
import { getRecentCustomers } from "@/lib/queries/sales";
import { PosRegister } from "@/components/sales/pos-register";

export const metadata: Metadata = { title: "Register" };

export default async function PosPage() {
  const shop = await requireAttendantShop();
  const [inventory, categories, customers] = await Promise.all([
    getShopInventory(shop.id),
    getItemCategories(shop.id),
    getRecentCustomers(shop.id, 25),
  ]);

  const items = inventory
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      sku: item.sku ?? "",
      barcode: item.barcode ?? "",
      imageUrl: item.imageUrl,
      unitName: item.unitName,
      unitPriceCents: item.unitPriceCents,
      available: item.quantity - item.reservedQuantity,
    }))
    .filter((item) => item.available > 0);

  return (
    <PosRegister
      shopName={shop.name}
      items={items}
      categories={categories}
      recentCustomers={customers.map((c) => ({
        id: c.name,
        name: c.name,
        contact: c.contact ?? "",
        vehicleReg: c.lastVehicleReg ?? "",
      }))}
    />
  );
}