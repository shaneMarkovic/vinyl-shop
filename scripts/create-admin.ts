import "./load-env"; // must be first — loads .env.local before ../db reads env
import bcrypt from "bcryptjs";
import { db, adminUsers } from "../db";

// Usage: npm run create-admin -- admin@shop.rs "a-strong-password"
async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> "<password>"');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .insert(adminUsers)
    .values({ email, passwordHash })
    .onConflictDoUpdate({ target: adminUsers.email, set: { passwordHash } });

  console.log(`✓ Admin user ready: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
