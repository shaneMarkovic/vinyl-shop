import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, adminUsers } from "@/db";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// Best-effort brute-force throttle: 5 failed attempts per email lock the
// account out for 15 minutes. In-memory, so it's per server instance and
// resets on deploy — a public deployment should also rate-limit at the edge.
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; lockedUntil: number }>();

function isLocked(key: string): boolean {
  const f = failures.get(key);
  return !!f && f.count >= MAX_FAILURES && Date.now() < f.lockedUntil;
}

function recordFailure(key: string): void {
  const f = failures.get(key) ?? { count: 0, lockedUntil: 0 };
  f.count += 1;
  f.lockedUntil = Date.now() + LOCK_MS;
  failures.set(key, f);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const key = email.toLowerCase();
        if (isLocked(key)) return null;

        const [user] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, email))
          .limit(1);

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
          recordFailure(key);
          return null;
        }

        failures.delete(key);
        return { id: String(user.id), email: user.email };
      },
    }),
  ],
});

/**
 * Page-level guard for the admin tree. The (protected) layout also checks,
 * but every admin page calls this itself so the data never renders without a
 * session even if the layout boundary is ever bypassed.
 */
export async function requireAdmin() {
  if (!(await auth())) redirect("/admin/login");
}
