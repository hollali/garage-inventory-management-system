import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { shops, users } from "@/db/schema";

export type SessionUser = NonNullable<Session["user"]>;

export const getSession = cache(async (): Promise<Session | null> => {
  return (await auth()) as Session | null;
});

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/shop");
  }
  return user;
}

export async function requireAttendant(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "attendant") {
    redirect("/admin");
  }
  return user;
}

export const getShopForAttendant = cache(async (userId: string) => {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.assignedAttendantId, userId))
    .limit(1);
  return shop ?? null;
});

export const getShopById = cache(async (shopId: string) => {
  const [shop] = await db
    .select()
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);
  return shop ?? null;
});

export const requireAttendantShop = cache(async () => {
  const user = await requireAttendant();
  const shop = await getShopForAttendant(user.id);
  if (!shop) {
    redirect("/shop/unassigned");
  }
  return shop;
});

export const getUserById = cache(async (userId: string) => {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
});
