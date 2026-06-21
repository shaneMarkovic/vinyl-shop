/*
  Kupindo genre normalization.

  Kupindo's "Žanr" field is a hand-entered, comma-joined list of subgenres —
  and some canonical genre names *contain commas* (e.g. "Rege, Ska i Dab"),
  so a naive comma split is wrong. Instead we match known genre phrases inside
  the raw string (longest first) and map them to a clean canonical label.

  Anything left over after matching is reported as `unmapped` so the importer
  can log it for review and the map can be extended.

  Edit CANONICAL to retune labels (or switch them to Serbian).
*/

// Kupindo phrase (as written on the site) → canonical display label.
const CANONICAL: Record<string, string> = {
  Rok: "Rock",
  Pop: "Pop",
  Džez: "Jazz",
  Bluz: "Blues",
  "Elektronska muzika": "Electronic",
  "Fank i Soul": "Funk / Soul",
  "Hard Rok i Metal": "Hard Rock / Metal",
  "Alternativni Rok": "Alternative Rock",
  "Rege, Ska i Dab": "Reggae / Ska / Dub",
  "Rep i Hip-Hop": "Hip-Hop / Rap",
  "Filmska muzika": "Soundtrack",
  "Svetska i Kantri muzika": "World / Country",
  Latino: "Latin",
  "R&B": "R&B",
  "Pank i Novi Talas": "Punk / New Wave",
  "Klasična muzika": "Classical",
  "Narodna muzika": "Folk (domaća)",
  "Starogradska muzika": "Starogradska",
  "Zabavna muzika": "Zabavna",
  "Duhovna muzika": "Spiritual",
  "Dečija muzika": "Children's",
  Ostalo: "Other",
  Audiofil: "Audiophile",
};

/** Lowercase, fold Serbian diacritics, so "Džez"/"Dzez" both match. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Precompute normalized keys, longest first (so multi-word phrases win).
const ENTRIES = Object.entries(CANONICAL)
  .map(([raw, canon]) => ({ nkey: norm(raw), canon }))
  .sort((a, b) => b.nkey.length - a.nkey.length);

export type GenreMapResult = {
  /** Canonical genre labels matched in the raw string. */
  genres: string[];
  /** The raw value if anything went unmatched (for inconsistency logging). */
  unmapped: string | null;
};

export function mapGenres(raw: string | null | undefined): GenreMapResult {
  if (!raw || !raw.trim()) return { genres: [], unmapped: null };

  let work = ` ${norm(raw)} `;
  const genres: string[] = [];

  for (const { nkey, canon } of ENTRIES) {
    if (work.includes(nkey)) {
      if (!genres.includes(canon)) genres.push(canon);
      work = work.split(nkey).join(" "); // remove all occurrences
    }
  }

  // Whatever alphabetic text remains was not recognised.
  const leftover = work
    .replace(/[,\/]/g, " ")
    .replace(/\bi\b/g, " ")
    .replace(/[^a-z]+/g, " ")
    .trim();

  return { genres, unmapped: leftover ? raw.trim() : null };
}
