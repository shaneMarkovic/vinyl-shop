import "./load-env"; // must be first — loads .env.local before ../db reads env
import { eq, isNull, or, sql } from "drizzle-orm";
import { db, records } from "../db";

// Removes the demo/sample records inserted by `npm run seed`.
// Cascades to their images and genre links. Leaves imported records untouched.
//
//   --legacy : also remove untagged (source IS NULL) rows. Safe only before any
//              manual or imported records exist — those would also be NULL.
//   --dry    : report what exists / would be removed, without deleting.
const legacy = process.argv.includes("--legacy");
const dry = process.argv.includes("--dry");

async function main() {
  const counts = await db
    .select({ source: records.source, count: sql<number>`count(*)::int` })
    .from(records)
    .groupBy(records.source);

  console.log("Records by source:");
  if (counts.length === 0) console.log("  (none)");
  for (const c of counts) console.log(`  ${c.source ?? "(untagged / NULL)"}: ${c.count}`);

  const where = legacy
    ? or(eq(records.source, "demo"), isNull(records.source))
    : eq(records.source, "demo");

  if (dry) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(records)
      .where(where);
    console.log(`\n[dry] would remove ${count} ${legacy ? "demo + untagged" : "demo"} record(s).`);
    process.exit(0);
  }

  const removed = await db.delete(records).where(where).returning({ id: records.id });
  console.log(`\n✓ Removed ${removed.length} ${legacy ? "demo + untagged" : "demo"} record(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
