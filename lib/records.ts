import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, records, images, genres, recordGenres, importIssues } from "@/db";

export type SortKey = "newest" | "artistAsc" | "priceAsc" | "priceDesc";

export type CatalogQuery = {
  search?: string;
  genreIds?: number[];
  formats?: string[];
  conditions?: string[];
  condition?: "new" | "used";
  priceMin?: number;
  priceMax?: number;
  decade?: number; // e.g. 1970 → 1970–1979
  inStockOnly?: boolean;
  sort?: SortKey;
  randomOrder?: boolean; // overrides `sort` — used for the rotating hero pick
  limit?: number;
  offset?: number;
};

const ORDER_BY: Record<SortKey, SQL> = {
  newest: desc(records.createdAt),
  artistAsc: asc(records.artist),
  priceAsc: asc(records.priceRsd),
  priceDesc: desc(records.priceRsd),
};

/**
 * Fetch catalog records with each one's cover image, applying search / filters /
 * sort. At "hundreds of records" scale a single indexed query is plenty.
 */
function buildConditions(query: CatalogQuery): SQL[] {
  const conditions: SQL[] = [];

  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(
      or(
        ilike(records.artist, term),
        ilike(records.title, term),
        ilike(records.label, term),
        ilike(records.catalogNumber, term),
      )!,
    );
  }

  // Genre is many-to-many → match records linked to ANY of the selected genres.
  if (query.genreIds?.length) {
    const sub = db
      .select({ id: recordGenres.recordId })
      .from(recordGenres)
      .where(inArray(recordGenres.genreId, query.genreIds));
    conditions.push(inArray(records.id, sub));
  }

  if (query.formats?.length)
    conditions.push(inArray(records.format, query.formats as never[]));
  if (query.conditions?.length)
    conditions.push(inArray(records.conditionMedia, query.conditions as never[]));
  if (query.condition === "new") conditions.push(eq(records.isNew, true));
  if (query.condition === "used") conditions.push(eq(records.isNew, false));
  if (query.priceMin != null)
    conditions.push(gte(records.priceRsd, query.priceMin));
  if (query.priceMax != null)
    conditions.push(lte(records.priceRsd, query.priceMax));
  if (query.decade != null) {
    conditions.push(gte(records.year, query.decade));
    conditions.push(lte(records.year, query.decade + 9));
  }
  if (query.inStockOnly) conditions.push(gt(records.quantity, 0));

  return conditions;
}

/** Total number of records matching the query (for pagination). */
export async function countRecords(query: CatalogQuery): Promise<number> {
  const conditions = buildConditions(query);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(records)
    .where(conditions.length ? and(...conditions) : undefined);
  return row?.count ?? 0;
}

export async function getRecords(query: CatalogQuery) {
  const conditions = buildConditions(query);

  let q = db
    .select({
      id: records.id,
      artist: records.artist,
      title: records.title,
      year: records.year,
      format: records.format,
      isNew: records.isNew,
      conditionMedia: records.conditionMedia,
      priceRsd: records.priceRsd,
      callForPrice: records.callForPrice,
      inStock: gt(records.quantity, 0),
    })
    .from(records)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(query.randomOrder ? sql`random()` : ORDER_BY[query.sort ?? "newest"])
    .$dynamic();

  if (query.limit != null) q = q.limit(query.limit);
  if (query.offset != null) q = q.offset(query.offset);

  const rows = await q;
  const covers = await coverKeysFor(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, coverKey: covers.get(r.id) ?? null }));
}

/**
 * Resolve each record's cover image key in one query, picking the best image
 * per record (isCover first, then lowest sortOrder). A correlated subquery in
 * the SELECT misbehaves under $dynamic, so we fetch + merge in JS.
 */
async function coverKeysFor(ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (ids.length === 0) return out;
  const imgs = await db
    .select({
      recordId: images.recordId,
      key: images.key,
      isCover: images.isCover,
      sortOrder: images.sortOrder,
    })
    .from(images)
    .where(inArray(images.recordId, ids));

  const best = new Map<number, { isCover: boolean; sortOrder: number }>();
  for (const im of imgs) {
    const prev = best.get(im.recordId);
    const better =
      !prev ||
      (im.isCover && !prev.isCover) ||
      (im.isCover === prev.isCover && im.sortOrder < prev.sortOrder);
    if (better) {
      best.set(im.recordId, { isCover: im.isCover, sortOrder: im.sortOrder });
      out.set(im.recordId, im.key);
    }
  }
  return out;
}

export type CatalogItem = Awaited<ReturnType<typeof getRecords>>[number];

// --- Admin catalog ---------------------------------------------------------

export type AdminQuery = {
  search?: string;
  format?: string;
  stock?: "in" | "out";
  enrichment?: "done" | "pending";
  sort?: SortKey;
  limit?: number;
  offset?: number;
};

function adminConditions(query: AdminQuery): SQL[] {
  const conditions: SQL[] = [];
  if (query.search) {
    const term = `%${query.search}%`;
    conditions.push(
      or(
        ilike(records.artist, term),
        ilike(records.title, term),
        ilike(records.label, term),
        ilike(records.catalogNumber, term),
      )!,
    );
  }
  if (query.format) conditions.push(eq(records.format, query.format as never));
  if (query.stock === "in") conditions.push(gt(records.quantity, 0));
  if (query.stock === "out") conditions.push(eq(records.quantity, 0));
  if (query.enrichment === "pending") conditions.push(eq(records.needsEnrichment, true));
  if (query.enrichment === "done") conditions.push(eq(records.needsEnrichment, false));
  return conditions;
}

export async function countAdminRecords(query: AdminQuery): Promise<number> {
  const conditions = adminConditions(query);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(records)
    .where(conditions.length ? and(...conditions) : undefined);
  return row?.count ?? 0;
}

export async function getAdminRecords(query: AdminQuery) {
  const conditions = adminConditions(query);
  let q = db
    .select({
      id: records.id,
      artist: records.artist,
      title: records.title,
      format: records.format,
      isNew: records.isNew,
      conditionMedia: records.conditionMedia,
      conditionSleeve: records.conditionSleeve,
      priceRsd: records.priceRsd,
      callForPrice: records.callForPrice,
      quantity: records.quantity,
      needsEnrichment: records.needsEnrichment,
    })
    .from(records)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(ORDER_BY[query.sort ?? "newest"])
    .$dynamic();
  if (query.limit != null) q = q.limit(query.limit);
  if (query.offset != null) q = q.offset(query.offset);

  const rows = await q;
  const covers = await coverKeysFor(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, coverKey: covers.get(r.id) ?? null }));
}

export type AdminItem = Awaited<ReturnType<typeof getAdminRecords>>[number];

/** Newest records (optionally in-stock only) for landing-page rows. */
export async function getNewArrivals(limit = 8, inStockOnly = false) {
  return getRecords({ sort: "newest", inStockOnly, limit });
}

/** A single hero pick: a random in-stock record (falls back to any record). */
export async function getFeatured(): Promise<CatalogItem | null> {
  const [inStock] = await getRecords({ randomOrder: true, inStockOnly: true, limit: 1 });
  if (inStock) return inStock;
  const [any] = await getRecords({ randomOrder: true, limit: 1 });
  return any ?? null;
}

// --- Admin dashboard -------------------------------------------------------

export type AdminStats = {
  total: number;
  inStock: number;
  outOfStock: number;
  inventoryValue: number; // Σ price × quantity, in RSD
  newThisWeek: number;
  pendingEnrichment: number;
  openIssues: number;
};

/** Headline numbers for the admin dashboard, in a single round trip each. */
export async function getAdminStats(): Promise<AdminStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[rec], [iss]] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        inStock: sql<number>`count(*) filter (where ${records.quantity} > 0)::int`,
        outOfStock: sql<number>`count(*) filter (where ${records.quantity} = 0)::int`,
        inventoryValue: sql<number>`coalesce(sum(coalesce(${records.priceRsd}, 0) * ${records.quantity}), 0)::int`,
        newThisWeek: sql<number>`count(*) filter (where ${records.createdAt} >= ${weekAgo})::int`,
        pendingEnrichment: sql<number>`count(*) filter (where ${records.needsEnrichment})::int`,
      })
      .from(records),
    db
      .select({ openIssues: sql<number>`count(*)::int` })
      .from(importIssues)
      .where(eq(importIssues.resolved, false)),
  ]);

  return {
    total: rec?.total ?? 0,
    inStock: rec?.inStock ?? 0,
    outOfStock: rec?.outOfStock ?? 0,
    inventoryValue: rec?.inventoryValue ?? 0,
    newThisWeek: rec?.newThisWeek ?? 0,
    pendingEnrichment: rec?.pendingEnrichment ?? 0,
    openIssues: iss?.openIssues ?? 0,
  };
}

/** Every genre with its record count (including genres with zero records). */
export async function getAllGenresWithCounts() {
  return db
    .select({
      id: genres.id,
      name: genres.name,
      count: sql<number>`count(${recordGenres.recordId})::int`,
    })
    .from(genres)
    .leftJoin(recordGenres, eq(recordGenres.genreId, genres.id))
    .groupBy(genres.id, genres.name)
    .orderBy(genres.name);
}

/** Genres that have at least one record, with counts. */
export async function getGenresWithCounts() {
  const rows = await db
    .select({
      id: genres.id,
      name: genres.name,
      count: sql<number>`count(${recordGenres.recordId})::int`,
    })
    .from(genres)
    .leftJoin(recordGenres, eq(recordGenres.genreId, genres.id))
    .groupBy(genres.id, genres.name)
    .having(sql`count(${recordGenres.recordId}) > 0`)
    .orderBy(genres.name);
  return rows;
}

/** Full record detail with images and genres, or null if not found. */
export async function getRecordById(id: number) {
  return db.query.records.findFirst({
    where: eq(records.id, id),
    with: {
      images: { orderBy: (img, { desc, asc }) => [desc(img.isCover), asc(img.sortOrder)] },
      recordGenres: { with: { genre: true } },
    },
  });
}
