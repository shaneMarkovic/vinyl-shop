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

/** Replace a record's genres from a comma-separated list of names. */
async function syncGenres(recordId: number, csv: string | null) {
  const names = [...new Set((csv ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  await db.delete(recordGenres).where(eq(recordGenres.recordId, recordId));
  for (const name of names) {
    await db.insert(genres).values({ name }).onConflictDoNothing();
    const [g] = await db.select({ id: genres.id }).from(genres).where(eq(genres.name, name)).limit(1);
    if (g) await db.insert(recordGenres).values({ recordId, genreId: g.id }).onConflictDoNothing();
  }
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
    .values({ ...data, priceRsd: data.priceRsd ?? null })
    .returning({ id: records.id });
  await syncGenres(row.id, formData.get("genres") as string | null);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateRecord(id: number, formData: FormData) {
  await requireAuth();
  const data = parse(formData);
  await db
    .update(records)
    .set({ ...data, priceRsd: data.priceRsd ?? null, updatedAt: new Date() })
    .where(eq(records.id, id));
  await syncGenres(id, formData.get("genres") as string | null);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteRecord(id: number) {
  await requireAuth();
  await db.delete(records).where(eq(records.id, id));
  revalidatePath("/admin");
  redirect("/admin");
}

/** Make one image the cover (and clear the flag on the record's others). */
export async function setCoverImage(recordId: number, imageId: number) {
  await requireAuth();
  await db.update(images).set({ isCover: false }).where(eq(images.recordId, recordId));
  await db.update(images).set({ isCover: true }).where(eq(images.id, imageId));
  revalidatePath(`/admin/records/${recordId}`);
}

export async function deleteImage(recordId: number, imageId: number) {
  await requireAuth();
  await db.delete(images).where(and(eq(images.id, imageId), eq(images.recordId, recordId)));
  revalidatePath(`/admin/records/${recordId}`);
}

/** Upload one or more images for a record to R2 and record them. */
export async function uploadImage(recordId: number, formData: FormData) {
  await requireAuth();
  if (!isR2Configured()) throw new Error("R2 storage is not configured");

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  const existing = await db
    .select({ sortOrder: images.sortOrder })
    .from(images)
    .where(eq(images.recordId, recordId));
  let nextOrder = existing.reduce((m, i) => Math.max(m, i.sortOrder + 1), 0);
  let hasCover = existing.length > 0; // keep the current cover; new uploads aren't cover

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const key = `records/${recordId}/up-${Date.now()}-${nextOrder}.${ext}`;
    await uploadObject(key, bytes, file.type || "image/jpeg");
    await db.insert(images).values({ recordId, key, isCover: !hasCover, sortOrder: nextOrder });
    hasCover = true;
    nextOrder++;
  }
  revalidatePath(`/admin/records/${recordId}`);
}

export async function resolveIssue(id: number) {
  await requireAuth();
  await db.update(importIssues).set({ resolved: true }).where(eq(importIssues.id, id));
  revalidatePath("/admin/issues");
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
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

// --- Bulk record actions ---------------------------------------------------

const idsSchema = z.array(z.coerce.number().int().positive()).min(1);

export async function bulkDeleteRecords(ids: number[]) {
  await requireAuth();
  const valid = idsSchema.parse(ids);
  await db.delete(records).where(inArray(records.id, valid));
  revalidatePath("/admin/records");
  revalidatePath("/");
}

/** Set stock to in/out for many records at once (1 if marking in stock, else 0). */
export async function bulkSetStock(ids: number[], inStock: boolean) {
  await requireAuth();
  const valid = idsSchema.parse(ids);
  await db
    .update(records)
    .set({ quantity: inStock ? 1 : 0, updatedAt: new Date() })
    .where(inArray(records.id, valid));
  revalidatePath("/admin/records");
  revalidatePath("/");
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
  revalidatePath("/admin/records");
  revalidatePath("/");
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
  revalidatePath("/admin/genres");
  revalidatePath("/");
}

export async function deleteGenre(id: number) {
  await requireAuth();
  // record_genres rows cascade on the FK; the records themselves stay.
  await db.delete(genres).where(eq(genres.id, id));
  revalidatePath("/admin/genres");
  revalidatePath("/");
}

/** Move every record from `sourceId` onto `targetId`, then drop the source. */
export async function mergeGenres(sourceId: number, targetId: number) {
  await requireAuth();
  if (sourceId === targetId) return;
  const links = await db
    .select({ recordId: recordGenres.recordId })
    .from(recordGenres)
    .where(eq(recordGenres.genreId, sourceId));
  for (const { recordId } of links) {
    await db
      .insert(recordGenres)
      .values({ recordId, genreId: targetId })
      .onConflictDoNothing();
  }
  await db.delete(genres).where(eq(genres.id, sourceId));
  revalidatePath("/admin/genres");
  revalidatePath("/");
}
