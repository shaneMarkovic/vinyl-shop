"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatLabel } from "@/lib/format";

const FORMATS = ["LP", "2xLP", '7"', '10"', '12"', "other"];
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "artistAsc", label: "Artist A–Z" },
  { value: "priceAsc", label: "Price ↑" },
  { value: "priceDesc", label: "Price ↓" },
];

const sel =
  "rounded-md border border-black/20 bg-white px-2.5 py-2 text-sm outline-none focus:border-black/50";

export function AdminToolbar({ total }: { total: number }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(mut: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("page"); // any filter change resets to page 1
    start(() => router.push(`${pathname}?${p.toString()}`, { scroll: false }));
  }

  const set = (k: string, v: string) =>
    push((p) => (v ? p.set(k, v) : p.delete(k)));

  function onSearch(v: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set("q", v), 300);
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${isPending ? "opacity-60" : ""}`}>
      <input
        type="search"
        defaultValue={sp.get("q") ?? ""}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search artist, title, label, cat #…"
        className="min-w-[220px] flex-1 rounded-md border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-black/50"
      />
      <select value={sp.get("format") ?? ""} onChange={(e) => set("format", e.target.value)} className={sel}>
        <option value="">All formats</option>
        {FORMATS.map((f) => <option key={f} value={f}>{formatLabel(f)}</option>)}
      </select>
      <select value={sp.get("stock") ?? ""} onChange={(e) => set("stock", e.target.value)} className={sel}>
        <option value="">Any stock</option>
        <option value="in">In stock</option>
        <option value="out">Out of stock</option>
      </select>
      <select value={sp.get("enrichment") ?? ""} onChange={(e) => set("enrichment", e.target.value)} className={sel}>
        <option value="">Any data</option>
        <option value="done">Enriched</option>
        <option value="pending">Needs enrichment</option>
      </select>
      <select value={sp.get("sort") ?? "newest"} onChange={(e) => set("sort", e.target.value)} className={sel}>
        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <span className="ml-auto whitespace-nowrap text-sm text-black/50">
        {total.toLocaleString()} records
      </span>
    </div>
  );
}
