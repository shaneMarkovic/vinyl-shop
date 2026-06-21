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
