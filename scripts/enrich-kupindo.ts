import "./load-env"; // must be first — loads .env.local before ../db reads env
import * as cheerio from "cheerio";
import { and, asc, eq, notInArray } from "drizzle-orm";
import { db, records, genres, recordGenres, importIssues, images as imagesTable } from "../db";
import { isR2Configured, uploadObject } from "../lib/storage";
import { mapGenres } from "../lib/genre-map";
import { extractFromDescription } from "../lib/llm-extract";

/*
  Kupindo enrichment pass.

  For each record flagged needsEnrichment=true (or all kupindo records with
  --force), fetches its detail page and fills in: year, format (Tip), genres
  (Žanr → canonical via lib/genre-map), label (Izdavač), new/used (Stanje),
  condition grades (PLOČA / OMOT → Goldmine), description, and the full photo
  gallery.

  Marketplace data is hand-entered, so anything that can't be parsed
  confidently is logged to import_issues for review in /admin/issues.

  Images are copied into R2 when configured (use --no-r2 to hotlink instead).

  Usage:
    npm run enrich:kupindo -- --limit=3 --dry      # parse & print, no writes
    npm run enrich:kupindo -- --limit=50           # enrich next 50
    npm run enrich:kupindo -- --force --limit=50   # re-enrich (ignore flag)
    npm run enrich:kupindo -- --limit=50 --no-r2   # keep images hotlinked
*/

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const num = (name: string, def: number) =>
  Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def);
const limit = num("limit", 25);
const delay = num("delay", 1000);
const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");
const copyToR2 = !process.argv.includes("--no-r2") && isR2Configured();
// --llm: use Haiku to fill grades/year the regex couldn't get.
// --llm-all: run Haiku on every record (not just the gaps).
const llmAll = process.argv.includes("--llm-all");
const llm = llmAll || process.argv.includes("--llm");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Decode the few HTML entities Kupindo emits in field values (e.g. R&amp;B → R&B).
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

function mapFormat(tip: string): "LP" | "2xLP" | '7"' | '10"' | '12"' | "other" {
  const t = tip.toUpperCase().replace(/\s+/g, "");
  if (/^(2LP|DLP|2XLP)/.test(t)) return "2xLP";
  if (t === "SP" || t === '7"' || t === "7") return '7"';
  if (t === "MLP" || t === '10"' || t === "10") return '10"';
  if (t === '12"' || t === "12" || t === "MAXI") return '12"';
  if (t === "LP") return "LP";
  return "other";
}

type Detail = {
  year: number | null;
  formatRaw: string | null;
  format: ReturnType<typeof mapFormat>;
  genreRaw: string | null;
  label: string | null;
  isNew: boolean;
  // Raw Kupindo grade token on the 1–5 scale (e.g. "5", "5-", "4+").
  conditionMedia: string | null;
  conditionSleeve: string | null;
  description: string | null;
  imageUrls: string[];
};

function field(html: string, label: string): string | null {
  const m = html.match(new RegExp(`${label}:\\s*<strong>([^<]*)</strong>`, "i"));
  return m ? decodeEntities(m[1].trim()) || null : null;
}

function parseDetail(html: string): Detail {
  const $ = cheerio.load(html);
  const opisHtml = $("#opis").html() ?? "";
  const opisText = opisHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

  const yearRaw = field(opisHtml, "Godina izdanja");
  const formatRaw = field(opisHtml, "Tip");
  const genreRaw = field(opisHtml, "Žanr") ?? field(opisHtml, "Zanr");
  const label = field(opisHtml, "Izdavač") ?? field(opisHtml, "Izdavac");

  const stanje = html.match(/Stanje:\s*<\/td>\s*<td>\s*([^<]+?)\s*<\/td>/i)?.[1] ?? "";
  const isNew = /nekori[sš][cć]en|^nov|nov\b|zatvoren/i.test(stanje);

  const mediaM = opisText.match(/PLO[CČ]A\s*([1-5][+-]?)/i);
  const sleeveM = opisText.match(/OMOT\s*([1-5][+-]?)/i);

  const description =
    opisText
      .split("\n")
      .filter((l) => !/(LICNO PREUZIMANJE|POSTARIN|NA VE[CĆ]E KOLI[CČ]INE|ISPORUKA KOD|POPUST PO DOGOVORU)/i.test(l))
      .join("\n")
      .trim() || null;

  const seen = new Set<string>();
  const imageUrls: string[] = [];
  for (const m of html.matchAll(/static\.kupindoslike\.com\/([^"'\s]+?_slika_XL_(\d+)\.jpg)/gi)) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    imageUrls.push(`https://static.kupindoslike.com/${m[1]}`);
  }

  return {
    year: yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null,
    formatRaw,
    format: mapFormat(formatRaw ?? "LP"),
    genreRaw,
    label,
    isNew,
    conditionMedia: mediaM ? mediaM[1] : null,
    conditionSleeve: sleeveM ? sleeveM[1] : null,
    description,
    imageUrls,
  };
}

async function fetchHtml(url: string): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(1500 * attempt);
    }
  }
  return "";
}

async function genreId(name: string): Promise<number> {
  await db.insert(genres).values({ name }).onConflictDoNothing();
  const [g] = await db.select({ id: genres.id }).from(genres).where(eq(genres.name, name)).limit(1);
  return g.id;
}

async function storeImages(recordId: number, urls: string[]): Promise<void> {
  await db.delete(imagesTable).where(eq(imagesTable.recordId, recordId));
  for (let i = 0; i < urls.length; i++) {
    let key = urls[i];
    if (copyToR2) {
      const res = await fetch(urls[i], { headers: { "User-Agent": UA } });
      key = await uploadObject(`records/${recordId}/${i}.jpg`, new Uint8Array(await res.arrayBuffer()), "image/jpeg");
    }
    await db.insert(imagesTable).values({ recordId, key, isCover: i === 0, sortOrder: i });
  }
}

let issueCount = 0;
async function logIssue(
  recordId: number,
  externalId: string | null,
  fieldName: string,
  issue: string,
  rawValue: string | null,
): Promise<void> {
  issueCount++;
  if (dry) return;
  await db
    .insert(importIssues)
    .values({ recordId, source: "kupindo", externalId, field: fieldName, issue, rawValue })
    .onConflictDoUpdate({
      target: [importIssues.externalId, importIssues.field, importIssues.issue],
      set: { rawValue, recordId, resolved: false },
    });
}

async function main() {
  console.log(
    `Enriching up to ${limit}${force ? " (force re-run)" : ""}${dry ? " (dry)" : ""} — images: ${copyToR2 ? "R2" : "hotlink"}${llm ? `, Haiku: ${llmAll ? "all" : "gaps"}` : ""}\n`,
  );

  const rows = await db
    .select({ id: records.id, sourceUrl: records.sourceUrl, externalId: records.externalId, artist: records.artist, title: records.title })
    .from(records)
    .where(force ? eq(records.source, "kupindo") : and(eq(records.source, "kupindo"), eq(records.needsEnrichment, true)))
    .orderBy(asc(records.id))
    .limit(limit);

  let done = 0;
  for (const r of rows) {
    if (!r.sourceUrl) continue;
    try {
    const d = parseDetail(await fetchHtml(r.sourceUrl));
    const { genres: mapped, unmapped } = mapGenres(d.genreRaw);
    // Keep raw genre as a fallback so nothing is silently dropped.
    const genreList = mapped.length ? mapped : d.genreRaw ? [d.genreRaw] : [];

    // Haiku gap-fill: only when regex left a grade/year empty (or --llm-all).
    let llmUsed = false;
    if (llm && (llmAll || !d.conditionMedia || !d.conditionSleeve || !d.year)) {
      const ex = await extractFromDescription({ artist: r.artist, title: r.title, description: d.description });
      if (ex && ex.confidence !== "low") {
        if (!d.conditionMedia && ex.conditionMedia) { d.conditionMedia = ex.conditionMedia; llmUsed = true; }
        if (!d.conditionSleeve && ex.conditionSleeve) { d.conditionSleeve = ex.conditionSleeve; llmUsed = true; }
        if (!d.year && ex.year) { d.year = ex.year; llmUsed = true; }
      }
    }

    if (dry) {
      console.log(`• ${r.artist} — ${r.title}`);
      console.log(`    year=${d.year} format=${d.format} genres=[${genreList.join(", ")}] grades=${d.conditionMedia ?? "?"}/${d.conditionSleeve ?? "?"}${llmUsed ? " (haiku)" : ""} photos=${d.imageUrls.length}${unmapped ? `  ⚠ unmapped genre: ${unmapped}` : ""}`);
      continue;
    }

    await db
      .update(records)
      .set({
        year: d.year,
        format: d.format,
        label: d.label,
        isNew: d.isNew,
        conditionMedia: d.conditionMedia,
        conditionSleeve: d.conditionSleeve,
        description: d.description,
        needsEnrichment: false,
        updatedAt: new Date(),
      })
      .where(eq(records.id, r.id));

    if (genreList.length) {
      await db.delete(recordGenres).where(eq(recordGenres.recordId, r.id));
      for (const name of genreList) {
        const gid = await genreId(name);
        await db.insert(recordGenres).values({ recordId: r.id, genreId: gid }).onConflictDoNothing();
      }
    }
    if (d.imageUrls.length) await storeImages(r.id, d.imageUrls);

    // --- Track inconsistencies for human review --------------------------
    if (unmapped) await logIssue(r.id, r.externalId, "genre", "unmapped", unmapped);
    if (!d.year) await logIssue(r.id, r.externalId, "year", "missing", null);
    if (d.format === "other" && d.formatRaw) await logIssue(r.id, r.externalId, "format", "unknown", d.formatRaw);
    if (!d.conditionMedia) await logIssue(r.id, r.externalId, "conditionMedia", "missing", null);
    if (!d.conditionSleeve) await logIssue(r.id, r.externalId, "conditionSleeve", "missing", null);
    if (!d.imageUrls.length) await logIssue(r.id, r.externalId, "images", "missing", null);

    done++;
    console.log(`✓ ${r.artist} — ${r.title} (${d.format}, ${genreList.join("/") || "—"}, ${d.conditionMedia ?? "?"}/${d.conditionSleeve ?? "?"}${llmUsed ? " haiku" : ""}, ${d.imageUrls.length} photos)${unmapped ? "  ⚠" : ""}`);
    } catch (err) {
      // Leave needsEnrichment=true so the record is retried on the next batch.
      console.warn(`✗ ${r.artist} — ${r.title}: ${(err as Error).message}`);
    } finally {
      await sleep(delay);
    }
  }

  if (!dry && done > 0) {
    // Drop genres no record points at anymore (e.g. pre-mapping leftovers).
    await db.delete(genres).where(notInArray(genres.id, db.select({ id: recordGenres.genreId }).from(recordGenres)));
  }

  console.log(`\n${dry ? "Dry run complete." : `✓ Enriched ${done} record(s).`} Inconsistencies logged: ${issueCount}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
