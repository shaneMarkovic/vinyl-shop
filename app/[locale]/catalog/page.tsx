import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getRecords,
  countRecords,
  getGenresWithCounts,
  type CatalogQuery,
  type SortKey,
} from "@/lib/records";
import { pageAlternates } from "@/lib/seo";
import { RecordCard } from "@/components/record-card";
import { CatalogFilters } from "@/components/catalog-filters";
import { CatalogSearchBar } from "@/components/catalog-search-bar";
import { Pagination } from "@/components/pagination";

// The catalog is driven by search params (filters, search, pagination), so it
// is always rendered per request — don't attempt to prerender a static shell.
export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return {
    title: t("title"),
    alternates: pageAlternates("/catalog", locale),
  };
}

const SORTS: SortKey[] = ["newest", "artistAsc", "priceAsc", "priceDesc"];
const PAGE_SIZE = 24;

function toArray(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}
function toInt(v: string | string[] | undefined): number | undefined {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) ? n : undefined;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CatalogPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const sp = await props.searchParams;
  const t = await getTranslations("catalog");
  const genres = await getGenresWithCounts();

  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort = (SORTS.includes(sortRaw as SortKey) ? sortRaw : "newest") as SortKey;
  const condition = (sp.condition === "new" || sp.condition === "used"
    ? sp.condition
    : undefined) as "new" | "used" | undefined;

  const page = Math.max(1, toInt(sp.page) ?? 1);

  // Shared filter set; the list query adds pagination on top.
  const filters: CatalogQuery = {
    search: (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() || undefined,
    genreIds: toArray(sp.genre).map(Number).filter(Number.isFinite),
    formats: toArray(sp.format),
    conditions: toArray(sp.grade),
    condition,
    priceMin: toInt(sp.priceMin),
    priceMax: toInt(sp.priceMax),
    decade: toInt(sp.decade),
    inStockOnly: !!sp.inStock,
    sort,
  };

  const [items, total] = await Promise.all([
    getRecords({ ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countRecords(filters),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight mb-6">
        {t("title")}
      </h1>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <CatalogFilters genres={genres} />

        <div>
          <CatalogSearchBar
            resultsLabel={t("resultsCount", { count: total })}
            sortLabel={t("sortBy")}
            searchPlaceholder={t("searchPlaceholder")}
            sortOptions={SORTS.map((s) => ({ value: s, label: t(`sort.${s}`) }))}
          />

          {items.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t("noResults")}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((record) => (
                  <RecordCard key={record.id} record={record} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
