import "./load-env"; // must be first — loads .env.local before ../db reads env
import * as cheerio from "cheerio";
import { and, eq } from "drizzle-orm";
import { db, records, images } from "../db";

/*
  Kupindo listing importer (listing-first pass).

  Crawls the seller's paginated "SpisakPredmeta" listing, keeps only vinyl
  (detail URLs under the "/Ploce/" section), and upserts each item keyed by
  (source='kupindo', externalId=item id) so the run is idempotent / resumable.

  It imports listing-level data only — title, price, cover thumbnail. Condition
  grade, extra photos and description live on each item's detail page and are
  filled in later by a separate enrichment pass (records are flagged
  needsEnrichment=true). Images are hotlinked from kupindoslike.com for now;
  enrichment will copy them into R2.

  Usage:
    npm run import:kupindo -- --pages=2            # first 2 pages (test)
    npm run import:kupindo -- --start=1 --pages=1151  # full run
    npm run import:kupindo -- --pages=1 --dry      # parse only, no DB writes
*/

const SELLER = "JOCA33LP";
const BASE = `https://www.kupindo.com/Clan/${SELLER}/SpisakPredmeta`;
const SOURCE = "kupindo";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

type Args = { start: number; pages: number; delay: number; dry: boolean };

function parseArgs(): Args {
  const get = (name: string) =>
    process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  return {
    start: Number(get("start") ?? 1),
    pages: Number(get("pages") ?? 1),
    delay: Number(get("delay") ?? 800),
    dry: process.argv.includes("--dry"),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Listing = {
  externalId: string;
  sourceUrl: string;
  artist: string;
  title: string;
  priceRsd: number | null;
  callForPrice: boolean;
  imageUrl: string | null;
};

/** Split "ARTIST - ALBUM" on the first " - ". */
function splitTitle(raw: string): { artist: string; title: string } {
  const clean = raw.replace(/\s+/g, " ").trim();
  const idx = clean.indexOf(" - ");
  if (idx === -1) return { artist: clean, title: "—" };
  return {
    artist: clean.slice(0, idx).trim(),
    title: clean.slice(idx + 3).trim() || "—",
  };
}

function parsePrice(raw: string): { priceRsd: number | null; callForPrice: boolean } {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return { priceRsd: null, callForPrice: true };
  return { priceRsd: Number(digits), callForPrice: false };
}

async function fetchPage(n: number): Promise<string> {
  const url = n === 1 ? BASE : `${BASE}_strana_${n}`;
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

/** Extract vinyl listings (section "/Ploce/") from one listing page. */
function parseListings(html: string): Listing[] {
  const $ = cheerio.load(html);
  const out: Listing[] = [];

  $("div.listing-item").each((_, el) => {
    const item = $(el);
    const href =
      item.find("h3 a").attr("href") ?? item.find("a").attr("href") ?? "";

    // Vinyl only. Detail URLs come in two shapes, both containing /Ploce/<id>_ :
    //   https://www.kupindo.com/showcontent/2143/Ploce/84531779_SLUG
    //   https://www.kupindo.com/Ploce/84522011_SLUG
    const m = href.match(/\/Ploce\/(\d+)_/);
    if (!m) return;

    const externalId = m[1];
    const rawTitle = item.find("h3 a").attr("title") ?? item.find("h3 a").text();
    const { artist, title } = splitTitle(rawTitle);
    const { priceRsd, callForPrice } = parsePrice(item.find(".item-price").text());

    let imageUrl = item.find("img").attr("src") ?? null;
    if (imageUrl?.startsWith("//")) imageUrl = `https:${imageUrl}`;

    out.push({ externalId, sourceUrl: href, artist, title, priceRsd, callForPrice, imageUrl });
  });

  return out;
}

async function upsert(listing: Listing): Promise<void> {
  const [row] = await db
    .insert(records)
    .values({
      artist: listing.artist || "—",
      title: listing.title || "—",
      // Listing presence implies it's for sale → in stock. Real qty unknown.
      quantity: 1,
      priceRsd: listing.priceRsd,
      callForPrice: listing.callForPrice,
      source: SOURCE,
      externalId: listing.externalId,
      sourceUrl: listing.sourceUrl,
      needsEnrichment: true,
    })
    .onConflictDoUpdate({
      target: [records.source, records.externalId],
      set: {
        artist: listing.artist || "—",
        title: listing.title || "—",
        priceRsd: listing.priceRsd,
        callForPrice: listing.callForPrice,
        quantity: 1,
        sourceUrl: listing.sourceUrl,
        updatedAt: new Date(),
      },
    })
    .returning({ id: records.id });

  // Refresh the cover image idempotently.
  if (listing.imageUrl && row) {
    await db.delete(images).where(and(eq(images.recordId, row.id), eq(images.isCover, true)));
    await db.insert(images).values({
      recordId: row.id,
      key: listing.imageUrl,
      isCover: true,
      sortOrder: 0,
    });
  }
}

async function main() {
  const { start, pages, delay, dry } = parseArgs();
  console.log(`Kupindo import — pages ${start}..${start + pages - 1}${dry ? " (dry run)" : ""}`);

  let vinyl = 0;
  let imported = 0;

  let failed = 0;
  for (let p = start; p < start + pages; p++) {
    try {
      const html = await fetchPage(p);
      const itemCount = cheerio.load(html)("div.listing-item").length;
      const listings = parseListings(html);
      vinyl += listings.length;

      if (!dry) {
        for (const l of listings) {
          await upsert(l);
          imported++;
        }
      }

      console.log(
        `  page ${p}: ${listings.length} vinyl items${dry ? "" : ` (imported ${imported} total)`}`,
      );

      // Stop early if a page yields nothing (past the end).
      if (itemCount === 0) {
        console.log("  no items on page — stopping.");
        break;
      }
    } catch (err) {
      // One bad page shouldn't abort the whole crawl; resume gaps with --start.
      failed++;
      console.warn(`  page ${p} failed: ${(err as Error).message} — skipping`);
    }

    if (p < start + pages - 1) await sleep(delay);
  }
  if (failed) console.log(`(${failed} page(s) failed — re-run with --start to backfill)`);

  console.log(`✓ Done. Vinyl items seen: ${vinyl}${dry ? " (dry — nothing written)" : `, upserted: ${imported}`}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
