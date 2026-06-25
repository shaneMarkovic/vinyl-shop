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

// Display names for vinyl formats. The stored enum values stay as-is (e.g. 7",
// 12") so existing data and filter URLs keep working; only the label shown to
// people is friendlier. Anything not listed falls back to its raw value.
const FORMAT_LABELS: Record<string, string> = {
  '7"': "Singl ploča",
  '12"': "Maxi Singl",
};

export function formatLabel(value: string): string {
  return FORMAT_LABELS[value] ?? value;
}
