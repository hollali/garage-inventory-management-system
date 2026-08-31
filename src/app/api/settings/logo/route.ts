import { NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireUser } from "@/lib/dal";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_SIZE = 2 * 1024 * 1024;

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: Request) {
  const user = await requireUser();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPEG, WebP or SVG images are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Image must be 2MB or smaller." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await mkdir(UPLOAD_DIR, { recursive: true });

    const extension = extFromMime(file.type);
    const filename = `logo-${Date.now()}${extension}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    const [existing] = await db.select().from(siteSettings).limit(1);
    if (existing) {
      await db
        .update(siteSettings)
        .set({ logoUrl: publicUrl, updatedAt: new Date() })
        .where(eq(siteSettings.id, existing.id));
      if (existing.logoUrl?.startsWith("/uploads/")) {
        await unlink(path.join(process.cwd(), "public", existing.logoUrl)).catch(() => {});
      }
    } else {
      await db.insert(siteSettings).values({ logoUrl: publicUrl });
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Logo upload failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const user = await requireUser();
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [existing] = await db.select().from(siteSettings).limit(1);
    if (existing?.logoUrl?.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", existing.logoUrl)).catch(() => {});
    }
    if (existing) {
      await db
        .update(siteSettings)
        .set({ logoUrl: null, updatedAt: new Date() })
        .where(eq(siteSettings.id, existing.id));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Logo removal failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Removal failed." },
      { status: 500 },
    );
  }
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return ".png";
  }
}
