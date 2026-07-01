// RSD (Serbian dinar) is the shop's main currency. Prices are whole dinars,
// formatted with the Serbian grouping separator, e.g. 10900 → "10.900 RSD".
const rsdFormatter = new Intl.NumberFormat("sr-RS", {
  maximumFractionDigits: 0,
});

export function formatRsd(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "";
  return `${rsdFormatter.format(n)} RSD`;
}

// Display names for vinyl formats in the ADMIN UI (single-language). The
// stored enum values stay as-is (e.g. 7", 12") so existing data and filter
// URLs keep working. Anything not listed falls back to its raw value.
const FORMAT_LABELS: Record<string, string> = {
  '7"': "Singl ploča",
  '12"': "Maxi Singl",
};

export function formatLabel(value: string): string {
  return FORMAT_LABELS[value] ?? value;
}

// The PUBLIC site localizes format names through next-intl instead. The raw
// enum values contain `"` which makes poor message keys, so map them to stable
// slugs used as t(`formats.${formatKey(value)}`) — see messages/*.json.
const FORMAT_KEYS: Record<string, string> = {
  LP: "lp",
  "2xLP": "lp2",
  '7"': "single7",
  '10"': "lp10",
  '12"': "maxi12",
  other: "other",
};

export function formatKey(value: string): string {
  return FORMAT_KEYS[value] ?? "other";
}
