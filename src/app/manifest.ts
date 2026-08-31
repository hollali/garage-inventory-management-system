import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/queries/settings";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let settings;
  try {
    settings = await getSiteSettings();
  } catch {
    settings = null;
  }
  const brand = settings?.brandName ?? "Garage Inventory";
  const logo = settings?.logoUrl ?? "/icons/icon-192.png";

  return {
    name: brand,
    short_name: brand,
    description:
      "Manage tools and equipment inventory, sales, and staff across multiple shop locations.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9f9fa",
    theme_color: "#5664e8",
    icons: [
      { src: logo, sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
