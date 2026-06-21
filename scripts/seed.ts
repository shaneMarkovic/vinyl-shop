import "./load-env"; // must be first — loads .env.local before ../db reads env
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db, records, images, genres, recordGenres } from "../db";

const DEMO_SOURCE = "demo";

type Seed = {
  artist: string;
  title: string;
  year: number;
  country: string;
  label: string;
  catalogNumber: string;
  format: "LP" | "2xLP" | '7"' | '10"' | '12"' | "other";
  isNew: boolean;
  conditionMedia?: string; // Kupindo 1–5 grade (demo values are illustrative)
  conditionSleeve?: string;
  priceRsd: number | null; // whole dinars
  callForPrice: boolean;
  quantity: number;
  genres: string[];
  colors: [string, string];
};

const DATA: Seed[] = [
  { artist: "Miles Davis", title: "Kind of Blue", year: 1959, country: "USA", label: "Columbia", catalogNumber: "CL 1355", format: "LP", isNew: false, conditionMedia: "VG+", conditionSleeve: "VG", priceRsd: 5300, callForPrice: false, quantity: 2, genres: ["Jazz"], colors: ["#1e3a5f", "#0b1622"] },
  { artist: "Pink Floyd", title: "The Dark Side of the Moon", year: 1973, country: "UK", label: "Harvest", catalogNumber: "SHVL 804", format: "LP", isNew: false, conditionMedia: "VG", conditionSleeve: "VG", priceRsd: 4500, callForPrice: false, quantity: 1, genres: ["Rock"], colors: ["#111111", "#3a0ca3"] },
  { artist: "Daft Punk", title: "Random Access Memories", year: 2013, country: "EU", label: "Columbia", catalogNumber: "88883716861", format: "2xLP", isNew: true, priceRsd: 3990, callForPrice: false, quantity: 5, genres: ["Electronic"], colors: ["#23232b", "#c9a227"] },
  { artist: "Nina Simone", title: "I Put a Spell on You", year: 1965, country: "USA", label: "Philips", catalogNumber: "PHM 200-172", format: "LP", isNew: false, conditionMedia: "G+", conditionSleeve: "G", priceRsd: null, callForPrice: true, quantity: 1, genres: ["Soul", "Jazz"], colors: ["#5a189a", "#240046"] },
  { artist: "Fleetwood Mac", title: "Rumours", year: 1977, country: "USA", label: "Warner Bros.", catalogNumber: "BSK 3010", format: "LP", isNew: false, conditionMedia: "VG+", conditionSleeve: "VG+", priceRsd: 3500, callForPrice: false, quantity: 3, genres: ["Rock"], colors: ["#7f5539", "#3a2618"] },
  { artist: "Kendrick Lamar", title: "To Pimp a Butterfly", year: 2015, country: "USA", label: "TDE", catalogNumber: "B0022954-01", format: "2xLP", isNew: true, priceRsd: 4700, callForPrice: false, quantity: 4, genres: ["Hip-Hop"], colors: ["#1b1b1b", "#6c757d"] },
  { artist: "Bijelo Dugme", title: "Bitanga i princeza", year: 1979, country: "Yugoslavia", label: "Jugoton", catalogNumber: "LSY 63022", format: "LP", isNew: false, conditionMedia: "VG", conditionSleeve: "VG", priceRsd: 2900, callForPrice: false, quantity: 2, genres: ["Rock"], colors: ["#9d0208", "#370617"] },
  { artist: "Amy Winehouse", title: "Back to Black", year: 2006, country: "UK", label: "Island", catalogNumber: "173 412-1", format: "LP", isNew: true, priceRsd: 3300, callForPrice: false, quantity: 6, genres: ["Soul"], colors: ["#161616", "#495057"] },
  { artist: "Radiohead", title: "OK Computer", year: 1997, country: "UK", label: "Parlophone", catalogNumber: "NODATA 02", format: "2xLP", isNew: false, conditionMedia: "VG+", conditionSleeve: "VG+", priceRsd: 4900, callForPrice: false, quantity: 0, genres: ["Rock"], colors: ["#264653", "#1b2a2f"] },
  { artist: "John Coltrane", title: "A Love Supreme", year: 1965, country: "USA", label: "Impulse!", catalogNumber: "A-77", format: "LP", isNew: false, conditionMedia: "VG+", conditionSleeve: "VG", priceRsd: 5900, callForPrice: false, quantity: 1, genres: ["Jazz"], colors: ["#bb3e03", "#582000"] },
  { artist: "The Velvet Underground", title: "& Nico", year: 1967, country: "USA", label: "Verve", catalogNumber: "V6-5008", format: "LP", isNew: false, conditionMedia: "G+", conditionSleeve: "G+", priceRsd: 6990, callForPrice: false, quantity: 1, genres: ["Rock"], colors: ["#f6c90e", "#e0a800"] },
  { artist: "Massive Attack", title: "Mezzanine", year: 1998, country: "UK", label: "Virgin", catalogNumber: "WBRLP 4", format: "2xLP", isNew: false, conditionMedia: "VG", conditionSleeve: "VG", priceRsd: 4200, callForPrice: false, quantity: 2, genres: ["Electronic"], colors: ["#0b132b", "#1c2541"] },
];

function svgCover({ artist, title, colors }: Seed): string {
  const [c1, c2] = colors;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <g opacity="0.10" stroke="#fff" fill="none">
    <circle cx="470" cy="130" r="120" stroke-width="2"/>
    <circle cx="470" cy="130" r="92" stroke-width="2"/>
    <circle cx="470" cy="130" r="64" stroke-width="2"/>
  </g>
  <circle cx="470" cy="130" r="30" fill="#fff" opacity="0.18"/>
  <text x="48" y="470" fill="#fff" font-family="Georgia, serif" font-size="44" font-weight="700">${esc(artist)}</text>
  <text x="48" y="516" fill="#fff" opacity="0.82" font-family="Georgia, serif" font-size="28" font-style="italic">${esc(title)}</text>
</svg>`;
}

async function main() {
  const coversDir = join(process.cwd(), "public", "covers");
  mkdirSync(coversDir, { recursive: true });

  // Reset ONLY demo data — never touch imported (e.g. Kupindo) records.
  // Deleting the demo records cascades to their images and genre links.
  await db.delete(records).where(eq(records.source, DEMO_SOURCE));

  // Genres are shared, not demo-owned: upsert by name and read back the ids.
  const genreNames = [...new Set(DATA.flatMap((d) => d.genres))];
  await db
    .insert(genres)
    .values(genreNames.map((name) => ({ name })))
    .onConflictDoNothing();
  const allGenres = await db.select().from(genres);
  const genreId = new Map(allGenres.map((g) => [g.name, g.id]));

  // Records + covers + image rows + genre links.
  for (const d of DATA) {
    const [rec] = await db
      .insert(records)
      .values({
        artist: d.artist,
        title: d.title,
        year: d.year,
        country: d.country,
        label: d.label,
        catalogNumber: d.catalogNumber,
        format: d.format,
        isNew: d.isNew,
        conditionMedia: d.conditionMedia ?? null,
        conditionSleeve: d.conditionSleeve ?? null,
        priceRsd: d.priceRsd ?? null,
        callForPrice: d.callForPrice,
        quantity: d.quantity,
        description: null,
        source: DEMO_SOURCE,
      })
      .returning();

    const file = `${rec.id}.svg`;
    writeFileSync(join(coversDir, file), svgCover(d));
    await db.insert(images).values({ recordId: rec.id, key: `/covers/${file}`, isCover: true, sortOrder: 0 });

    await db
      .insert(recordGenres)
      .values(d.genres.map((name) => ({ recordId: rec.id, genreId: genreId.get(name)! })));
  }

  console.log(`✓ Seeded ${DATA.length} records, ${genreNames.length} genres, covers in public/covers/`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
