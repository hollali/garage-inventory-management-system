"use server";

import { createHash, randomBytes } from "crypto";
import { eq, and, isNull, isNotNull, lt, or } from "drizzle-orm";
import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { sendPasswordResetEmail, appName, appUrl } from "@/lib/mail";
import { logActivity } from "@/lib/activity";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { verifyTotp, generateTotpSecret, otpauthUrl } from "@/lib/totp";
import { requireAdmin } from "@/lib/dal";

const forgotSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
});

export async function requestPasswordReset(
  formData: FormData,
): Promise<{ message: string }> {
  const parsed = forgotSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { message: "Enter a valid email address." };
  }

  const blocked = rateLimit(`pwd:reset:${parsed.data.email}:${await clientIp()}`, {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!blocked.allowed) {
    return {
      message:
        "If an account exists for that email, a password reset link has been sent.",
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (user) {
    await db
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          or(
            isNotNull(passwordResetTokens.usedAt),
            lt(passwordResetTokens.expiresAt, new Date()),
          ),
        ),
      );

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const resetLink = `${appUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.email, resetLink);

    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "password.reset.requested",
    });
  }

  return {
    message:
      "If an account exists for that email, a password reset link has been sent.",
  };
}

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type ResetState = { errors?: string[]; message?: string } | undefined;

export async function resetPassword(
  prevState: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map((i) => i.message),
    };
  }

  const tokenHash = createHash("sha256")
    .update(parsed.data.token)
    .digest("hex");

  const blocked = rateLimit(`pwd:reset-token:${tokenHash}:${await clientIp()}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!blocked.allowed) {
    return { message: "Too many attempts. Try again later." };
  }

  const [tokenRecord] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (!tokenRecord || tokenRecord.expiresAt.getTime() < Date.now()) {
    return {
      message: "This reset link is invalid or has expired.",
    };
  }

  const passwordHash = await hash(parsed.data.password, 10);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, tokenRecord.userId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenRecord.id));

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, tokenRecord.userId))
    .limit(1);

  if (user) {
    await logActivity({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: "password.reset.completed",
    });
  }

  return {
    message: "Your password has been reset. You can now sign in.",
  };
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function needsTotp(
  email: string,
): Promise<{ requires: boolean; error?: string }> {
  const normalized = email.trim().toLowerCase();
  const ip = await clientIp();

  const blocked = rateLimit(`totp:check:${ip}:${normalized}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!blocked.allowed) {
    return { requires: false, error: "Too many attempts. Try again later." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  return { requires: Boolean(user?.totpEnabled) };
}

export async function startTotpSetup(): Promise<
  { secret: string; otpauth: string } | { error: string }
> {
  const admin = await requireAdmin();

  const secret = generateTotpSecret();
  const otpauth = otpauthUrl(secret, admin.email ?? "", appName);

  return { secret, otpauth };
}

export async function confirmTotp(
  secret: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  if (!verifyTotp(code, secret)) {
    return { ok: false, error: "Invalid verification code." };
  }

  await db
    .update(users)
    .set({ totpSecret: secret, totpEnabled: true })
    .where(eq(users.id, admin.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: admin.role,
    action: "auth.totp.enabled",
  });

  return { ok: true };
}

export async function disableTotp(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, admin.id))
    .limit(1);

  if (!user || !user.totpEnabled || !user.totpSecret) {
    return { ok: false, error: "Two-factor authentication is not enabled." };
  }

  if (!verifyTotp(code, user.totpSecret)) {
    return { ok: false, error: "Invalid verification code." };
  }

  await db
    .update(users)
    .set({ totpSecret: null, totpEnabled: false })
    .where(eq(users.id, admin.id));

  await logActivity({
    actorId: admin.id,
    actorName: admin.name,
    actorRole: admin.role,
    action: "auth.totp.disabled",
  });

  return { ok: true };
}
