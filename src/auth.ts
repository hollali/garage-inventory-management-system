import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { rateLimit } from "@/lib/ratelimit";
import { verifyTotp } from "@/lib/totp";

const credentialsSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
  totpCode: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "Two-factor code", type: "text" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const loginAttempt = rateLimit(`login:${parsed.data.email}`, {
          limit: 5,
          windowMs: 15 * 60 * 1000,
        });
        if (!loginAttempt.allowed) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1);

        if (!user || !user.active) return null;

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        if (user.totpEnabled && user.totpSecret) {
          if (
            !parsed.data.totpCode ||
            !verifyTotp(parsed.data.totpCode, user.totpSecret)
          ) {
            return null;
          }
        }

        await logActivity({
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role,
          action: "auth.login",
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "attendant";
      }
      return session;
    },
  },
});
