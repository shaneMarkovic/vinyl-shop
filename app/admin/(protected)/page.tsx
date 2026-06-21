import Link from "next/link";
import { getAdminStats } from "@/lib/records";
import { formatRsd } from "@/lib/format";

function Stat({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: "default" | "warn" | "good";
}) {
  const toneCls =
    tone === "warn"
      ? "text-amber-700"
      : tone === "good"
        ? "text-green-700"
        : "text-neutral-900";
  const inner = (
    <div className="rounded-lg border border-black/10 bg-white p-4 transition-colors hover:border-black/25">
      <div className="text-sm text-black/50">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneCls}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Link
          href="/admin/records/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          + Add record
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Total records" value={stats.total} href="/admin/records" />
        <Stat
          label="In stock"
          value={stats.inStock}
          tone="good"
          href="/admin/records?stock=in"
        />
        <Stat
          label="Out of stock"
          value={stats.outOfStock}
          href="/admin/records?stock=out"
        />
        <Stat label="Inventory value" value={formatRsd(stats.inventoryValue)} />
        <Stat label="New this week" value={stats.newThisWeek} href="/admin/records" />
        <Stat
          label="Needs enrichment"
          value={stats.pendingEnrichment}
          tone={stats.pendingEnrichment > 0 ? "warn" : "default"}
          href="/admin/records?enrichment=pending"
        />
      </div>

      {stats.openIssues > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Link href="/admin/issues" className="font-medium hover:underline">
            {stats.openIssues.toLocaleString()} open data issue
            {stats.openIssues === 1 ? "" : "s"} need review →
          </Link>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-black/50">Manage</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/records", label: "Records", desc: "Browse, edit, bulk-update" },
            { href: "/admin/genres", label: "Genres", desc: "Rename, merge, clean up" },
            { href: "/admin/issues", label: "Data issues", desc: "Review import problems" },
            { href: "/admin/settings", label: "Settings", desc: "Contact info & storefront" },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-lg border border-black/10 bg-white p-4 transition-colors hover:border-black/25"
            >
              <div className="font-medium">{c.label}</div>
              <div className="mt-0.5 text-sm text-black/50">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
