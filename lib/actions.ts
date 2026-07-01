"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import {
  db,
  records,
  importIssues,
  genres,
  recordGenres,
  images,
  settings,
} from "@/db";
import { SETTING_KEYS } from "@/lib/settings";
import { isR2Configured, uploadObject } from "@/lib/storage";

async function requireAuth() {
  if (!(await auth())) throw new Error("Unauthorized");
}

/**
 * Public pages live under locale prefixes (/sr, /en) and the admin under
 * /admin, so a page-level revalidatePath("/") reaches nothing real. Revalidate
 * from the root down instead — cheap at this catalog's size.
 */
function revalidateStore() {
  revalidatePath("/", "layout");
}

/** Replace a record's genres from a comma-separated list of names. */
async function syncGenres(recordId: number, csv: string | null) {
  const names = [...new Set((csv ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  if (names.length === 0) {
    await db.delete(recordGenres).where(eq(recordGenres.recordId, recordId));
    return;
  }
  // One upsert for all names; the no-op conflict update makes RETURNING yield
  // ids for already-existing genres too.
  const ids = await db
    .insert(genres)
    .values(names.map((name) => ({ name })))
    .onConflictDoUpdate({ target: genres.name, set: { name: sql`excluded.name` } })
    .returning({ id: genres.id });
  // Swap the links in a single batch (one transaction on the neon-http driver)
  // so a failure can't strand the record with its genres deleted.
  await db.batch([
    db.delete(recordGenres).where(eq(recordGenres.recordId, recordId)),
    db.insert(recordGenres).values(ids.map(({ id }) => ({ recordId, genreId: id }))),
  ]);
}

const recordSchema = z.object({
  artist: z.string().min(1),
  title: z.string().min(1),
  label: z.string().optional(),
  catalogNumber: z.string().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  country: z.string().optional(),
  format: z.enum(["LP", "2xLP", '7"', '10"', '12"', "other"]),
  isNew: z.boolean(),
  conditionMedia: z.enum(["5", "5-", "4+", "4", "4-", "3+", "3", "3-", "2", "1"]).optional(),
  conditionSleeve: z.enum(["5", "5-", "4+", "4", "4-", "3+", "3", "3-", "2", "1"]).optional(),
  priceRsd: z.coerce.number().int().min(0).optional(),
  callForPrice: z.boolean(),
  quantity: z.coerce.number().int().min(0),
  description: z.string().optional(),
});

// Drizzle silently drops `undefined` entries from .set(), so optional fields
// cleared in the form must become explicit NULLs or the old value would stick.
function toRow(data: z.infer<typeof recordSchema>) {
  return {
    ...data,
    label: data.label ?? null,
    catalogNumber: data.catalogNumber ?? null,
    year: data.year ?? null,
    country: data.country ?? null,
    conditionMedia: data.conditionMedia ?? null,
    conditionSleeve: data.conditionSleeve ?? null,
    priceRsd: data.priceRsd ?? null,
    description: data.description ?? null,
  };
}

function parse(formData: FormData) {
  const empty = (v: FormDataEntryValue | null) =>
    v === null || v === "" ? undefined : v;

  return recordSchema.parse({
    artist: formData.get("artist"),
    title: formData.get("title"),
    label: empty(formData.get("label")),
    catalogNumber: empty(formData.get("catalogNumber")),
    year: empty(formData.get("year")),
    country: empty(formData.get("country")),
    format: formData.get("format"),
    isNew: formData.get("isNew") === "on",
    conditionMedia: empty(formData.get("conditionMedia")),
    conditionSleeve: empty(formData.get("conditionSleeve")),
    priceRsd: empty(formData.get("priceRsd")),
    callForPrice: formData.get("callForPrice") === "on",
    quantity: formData.get("quantity") ?? 0,
    description: empty(formData.get("description")),
  });
}

export async function createRecord(formData: FormData) {
  await requireAuth();
  const data = parse(formData);
  const [row] = await db
    .insert(records)
    .values(toRow(data))
    .returning({ id: records.id });
  await syncGenres(row.id, formData.get("genres") as string | null);
  await saveImages(row.id, imageFiles(formData));
  revalidateStore();
  redirect("/admin");
}

export async function updateRecord(id: number, formData: FormData) {
  await requireAuth();
  const data = parse(formData);
  await db
    .update(records)
    .set({ ...toRow(data), updatedAt: new Date() })
    .where(eq(records.id, id));
  await syncGenres(id, formData.get("genres") as string | null);
  revalidateStore();
  redirect("/admin");
}

export async function deleteRecord(id: number) {
  await requireAuth();
  await db.delete(records).where(eq(records.id, id));
  revalidateStore();
  redirect("/admin");
}

/** Make one image the cover (and clear the flag on the record's others). */
export async function setCoverImage(recordId: number, imageId: number) {
  await requireAuth();
  await db.batch([
    db.update(images).set({ isCover: false }).where(eq(images.recordId, recordId)),
    db.update(images).set({ isCover: true }).where(eq(images.id, imageId)),
  ]);
  revalidateStore();
}

export async function deleteImage(recordId: number, imageId: number) {
  await requireAuth();
  await db.delete(images).where(and(eq(images.id, imageId), eq(images.recordId, recordId)));
  revalidateStore();
}

/** Pull non-empty uploaded image files off a submitted form. */
function imageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
}

// Only formats next/image can optimize; also caps how large one upload may be.
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Upload image files to R2 and record them against a record. */
async function saveImages(recordId: number, files: File[]) {
  if (files.length === 0) return;
  if (!isR2Configured()) throw new Error("R2 storage is not configured");

  for (const file of files) {
    if (!IMAGE_TYPES[file.type])
      throw new Error(`Unsupported image type: ${file.type || "unknown"}`);
    if (file.size > MAX_IMAGE_BYTES)
      throw new Error(`Image too large (max 10MB): ${file.name}`);
  }

  const existing = await db
    .select({ sortOrder: images.sortOrder })
    .from(images)
    .where(eq(images.recordId, recordId));
  let nextOrder = existing.reduce((m, i) => Math.max(m, i.sortOrder + 1), 0);
  const hasCover = existing.length > 0; // keep the current cover; new uploads aren't cover

  // Upload everything to R2 first, then insert the rows in one statement, so a
  // failed upload can't leave rows pointing at objects that never made it.
  const rows: (typeof images.$inferInsert)[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const key = `records/${recordId}/up-${Date.now()}-${nextOrder}.${IMAGE_TYPES[file.type]}`;
    await uploadObject(key, bytes, file.type);
    rows.push({ recordId, key, isCover: !hasCover && rows.length === 0, sortOrder: nextOrder });
    nextOrder++;
  }
  await db.insert(images).values(rows);
}

/** Upload one or more images for a record to R2 and record them. */
export async function uploadImage(recordId: number, formData: FormData) {
  await requireAuth();
  await saveImages(recordId, imageFiles(formData));
  revalidateStore();
}

export async function resolveIssue(id: number) {
  await requireAuth();
  await db.update(importIssues).set({ resolved: true }).where(eq(importIssues.id, id));
  // Only admin pages show issues; no need to touch the public cache.
  revalidatePath("/admin/issues");
  revalidatePath("/admin");
}

// --- Store settings --------------------------------------------------------

/** Upsert each known setting key from the submitted form. */
export async function updateSettings(formData: FormData) {
  await requireAuth();
  const now = new Date();
  for (const key of SETTING_KEYS) {
    const value = (formData.get(key) as string | null)?.trim() ?? "";
    await db
      .insert(settings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: now } });
  }
  // Contact info / store name / banner appear across the public site.
  revalidateStore();
}

// --- Bulk record actions ---------------------------------------------------

const idsSchema = z.array(z.coerce.number().int().positive()).min(1);

export async function bulkDeleteRecords(ids: number[]) {
  await requireAuth();
  const valid = idsSchema.parse(ids);
  await db.delete(records).where(inArray(records.id, valid));
  revalidateStore();
}

/**
 * Mark many records in/out of stock. "In" bumps zero quantities to 1 but keeps
 * real counts as they are; "out" zeroes the quantity.
 */
export async function bulkSetStock(ids: number[], inStock: boolean) {
  await requireAuth();
  const valid = idsSchema.parse(ids);
  await db
    .update(records)
    .set({
      quantity: inStock ? (sql`greatest(${records.quantity}, 1)` as never) : 0,
      updatedAt: new Date(),
    })
    .where(inArray(records.id, valid));
  revalidateStore();
}

/** Adjust prices by a flat amount (delta, can be negative) or a percentage. */
export async function bulkAdjustPrice(
  ids: number[],
  mode: "set" | "delta" | "percent",
  amount: number,
) {
  await requireAuth();
  const valid = idsSchema.parse(ids);
  const amt = z.coerce.number().finite().parse(amount);

  // Clamp at 0 so a discount can't drive a price negative. Rows with a null
  // price (call-for-price) are left untouched for delta/percent.
  const price = records.priceRsd;
  const next =
    mode === "set"
      ? sql`${Math.max(0, Math.round(amt))}`
      : mode === "delta"
        ? sql`greatest(0, ${price} + ${Math.round(amt)})`
        : sql`greatest(0, round(${price} * ${1 + amt / 100}))`;

  const where =
    mode === "set"
      ? inArray(records.id, valid)
      : and(inArray(records.id, valid), sql`${price} is not null`);

  await db
    .update(records)
    .set({ priceRsd: next as never, updatedAt: new Date() })
    .where(where);
  revalidateStore();
}

// --- Genre management ------------------------------------------------------

const genreNameSchema = z.string().trim().min(1).max(128);

export async function renameGenre(id: number, name: string) {
  await requireAuth();
  const clean = genreNameSchema.parse(name);
  // If the target name already exists, merge into it instead of erroring on the
  // unique constraint.
  const [existing] = await db
    .select({ id: genres.id })
    .from(genres)
    .where(and(eq(genres.name, clean), ne(genres.id, id)))
    .limit(1);
  if (existing) {
    await mergeGenres(id, existing.id);
    return;
  }
  await db.update(genres).set({ name: clean }).where(eq(genres.id, id));
  revalidateStore();
}

export async function deleteGenre(id: number) {
  await requireAuth();
  // record_genres rows cascade on the FK; the records themselves stay.
  await db.delete(genres).where(eq(genres.id, id));
  revalidateStore();
}

/** Move every record from `sourceId` onto `targetId`, then drop the source. */
export async function mergeGenres(sourceId: number, targetId: number) {
  await requireAuth();
  if (sourceId === targetId) return;
  const links = await db
    .select({ recordId: recordGenres.recordId })
    .from(recordGenres)
    .where(eq(recordGenres.genreId, sourceId));
  if (links.length > 0) {
    await db
      .insert(recordGenres)
      .values(links.map(({ recordId }) => ({ recordId, genreId: targetId })))
      .onConflictDoNothing();
  }
  await db.delete(genres).where(eq(genres.id, sourceId));
  revalidateStore();
}
