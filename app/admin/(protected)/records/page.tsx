import Link from "next/link";
import { requireAdmin } from "@/auth";
import {
  getAdminRecords,
  countAdminRecords,
  type AdminQuery,
  type SortKey,
} from "@/lib/records";
import { publicUrl } from "@/lib/storage";
import { formatRsd } from "@/lib/format";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { RecordsTable, type AdminRow } from "@/components/admin/records-table";

const PAGE_SIZE = 30;
const SORTS: SortKey[] = ["newest", "artistAsc", "priceAsc", "priceDesc"];

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminRecordsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await props.searchParams;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const sortRaw = one(sp.sort);
  const stockRaw = one(sp.stock);
  const enrRaw = one(sp.enrichment);

  const filters: AdminQuery = {
    search: one(sp.q)?.trim() || undefined,
    format: one(sp.format) || undefined,
    stock: stockRaw === "in" || stockRaw === "out" ? stockRaw : undefined,
    enrichment: enrRaw === "done" || enrRaw === "pending" ? enrRaw : undefined,
    sort: (SORTS.includes(sortRaw as SortKey) ? sortRaw : "newest") as SortKey,
  };

  const [rows, total] = await Promise.all([
    getAdminRecords({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countAdminRecords(filters),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Pre-resolve cover URLs and price labels on the server so the client table
  // stays free of the storage SDK and locale formatter.
  const tableRows: AdminRow[] = rows.map((r) => ({
    id: r.id,
    artist: r.artist,
    title: r.title,
    format: r.format,
    isNew: r.isNew,
    conditionMedia: r.conditionMedia,
    conditionSleeve: r.conditionSleeve,
    quantity: r.quantity,
    needsEnrichment: r.needsEnrichment,
    coverUrl: r.coverKey ? publicUrl(r.coverKey) : null,
    priceLabel: r.callForPrice || r.priceRsd == null ? "—" : formatRsd(r.priceRsd),
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Records</h1>
        <Link
          href="/admin/records/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          + Add record
        </Link>
      </div>

      <div className="mb-4">
        <AdminToolbar total={total} />
      </div>

      <RecordsTable rows={tableRows} />

      <AdminPagination page={page} totalPages={totalPages} />
    </div>
  );
}
