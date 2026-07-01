import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/auth";
import { db, importIssues, records } from "@/db";
import { resolveIssue } from "@/lib/actions";

const LABELS: Record<string, string> = {
  unmapped: "Unmapped value",
  missing: "Missing",
  unknown: "Unknown value",
  unparsed: "Could not parse",
};

export default async function IssuesPage() {
  await requireAdmin();
  // Summary by field + issue.
  const summary = await db
    .select({
      field: importIssues.field,
      issue: importIssues.issue,
      count: sql<number>`count(*)::int`,
    })
    .from(importIssues)
    .where(eq(importIssues.resolved, false))
    .groupBy(importIssues.field, importIssues.issue)
    .orderBy(desc(sql`count(*)`));

  const rows = await db
    .select({
      id: importIssues.id,
      recordId: importIssues.recordId,
      field: importIssues.field,
      issue: importIssues.issue,
      rawValue: importIssues.rawValue,
      artist: records.artist,
      title: records.title,
    })
    .from(importIssues)
    .leftJoin(records, eq(records.id, importIssues.recordId))
    .where(eq(importIssues.resolved, false))
    .orderBy(desc(importIssues.createdAt))
    .limit(300);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Data issues</h1>
        <Link href="/admin" className="text-sm text-black/60 hover:underline">
          ← Records
        </Link>
      </div>

      {summary.length === 0 ? (
        <p className="rounded-lg border border-black/10 bg-white p-6 text-black/60">
          No open issues. Imported data parsed cleanly. 🎉
        </p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {summary.map((s) => (
              <span key={`${s.field}-${s.issue}`} className="rounded-full border border-black/15 bg-white px-3 py-1 text-sm">
                {s.field} · {LABELS[s.issue] ?? s.issue}
                <span className="ml-1.5 font-semibold">{s.count}</span>
              </span>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-black/10 text-left text-black/60">
                <tr>
                  <th className="px-4 py-2 font-medium">Record</th>
                  <th className="px-4 py-2 font-medium">Field</th>
                  <th className="px-4 py-2 font-medium">Issue</th>
                  <th className="px-4 py-2 font-medium">Raw value</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-2">
                      {r.recordId ? (
                        <Link href={`/admin/records/${r.recordId}`} className="text-blue-600 hover:underline">
                          {r.artist} — {r.title}
                        </Link>
                      ) : (
                        <span className="text-black/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{r.field}</td>
                    <td className="px-4 py-2">{LABELS[r.issue] ?? r.issue}</td>
                    <td className="px-4 py-2 text-black/60">{r.rawValue ?? "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={resolveIssue.bind(null, r.id)}>
                        <button className="text-black/50 hover:text-black hover:underline">Resolve</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
