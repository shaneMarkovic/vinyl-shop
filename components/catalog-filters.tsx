"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { formatKey } from "@/lib/format";

export const FORMATS = ["LP", "2xLP", '7"', '10"', '12"', "other"];
export const CONDITIONS = ["5", "5-", "4+", "4", "4-", "3+", "3", "3-", "2", "1"];
export const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];

type Genre = { id: number; name: string; count: number };

// Module-scope so React doesn't remount them (and reset <details>/focus state)
// on every filter change.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="border-b border-border py-4">
      <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-wide marker:hidden">
        {title}
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-[var(--accent)]" />
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-xs text-muted-foreground">{count}</span>}
    </label>
  );
}

export function CatalogFilters({ genres }: { genres: Genre[] }) {
  const t = useTranslations("catalog");
  const tf = useTranslations("formats");
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false); // mobile drawer

  // Build the next URL from a mutator over a copy of current params.
  function update(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(sp.toString());
    mutate(params);
    params.delete("page"); // any filter change restarts at page 1
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const has = (key: string, value: string) =>
    sp.getAll(key).includes(value);

  const toggle = (key: string, value: string) =>
    update((p) => {
      const next = p.getAll(key).filter((v) => v !== value);
      if (!has(key, value)) next.push(value);
      p.delete(key);
      next.forEach((v) => p.append(key, v));
    });

  const setSingle = (key: string, value: string) =>
    update((p) => (value ? p.set(key, value) : p.delete(key)));

  const activeCount =
    sp.getAll("genre").length +
    sp.getAll("format").length +
    sp.getAll("grade").length +
    (sp.get("condition") ? 1 : 0) +
    (sp.get("decade") ? 1 : 0) +
    (sp.get("priceMin") || sp.get("priceMax") ? 1 : 0) +
    (sp.get("inStock") ? 1 : 0);

  const clearAll = () =>
    startTransition(() => router.push(pathname, { scroll: false }));

  const panel = (
    <div className="text-foreground">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{t("filters")}</h2>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs text-accent hover:underline">
            {t("clearAll")} ({activeCount})
          </button>
        )}
      </div>

      <Section title={t("genre")}>
        {genres.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
        {genres.map((g) => (
          <Check key={g.id} label={g.name} count={g.count} checked={has("genre", String(g.id))} onChange={() => toggle("genre", String(g.id))} />
        ))}
      </Section>

      <Section title={t("condition")}>
        {(["", "new", "used"] as const).map((v) => (
          <label key={v || "all"} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="condition"
              checked={(sp.get("condition") ?? "") === v}
              onChange={() => setSingle("condition", v)}
              className="accent-[var(--accent)]"
            />
            {v === "" ? t("all") : t(v)}
          </label>
        ))}
      </Section>

      <Section title={t("grade")}>
        {CONDITIONS.map((c) => (
          <Check key={c} label={c} checked={has("grade", c)} onChange={() => toggle("grade", c)} />
        ))}
      </Section>

      <Section title={t("format")}>
        {FORMATS.map((f) => (
          <Check key={f} label={tf(formatKey(f))} checked={has("format", f)} onChange={() => toggle("format", f)} />
        ))}
      </Section>

      <Section title={t("decade")}>
        {DECADES.map((d) => (
          <label key={d} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="decade"
              checked={sp.get("decade") === String(d)}
              onChange={() => setSingle("decade", String(d))}
              className="accent-[var(--accent)]"
            />
            {d}s
          </label>
        ))}
      </Section>

      <Section title={t("price")}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="min"
            defaultValue={sp.get("priceMin") ?? ""}
            onBlur={(e) => setSingle("priceMin", e.target.value)}
            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            min={0}
            placeholder="max"
            defaultValue={sp.get("priceMax") ?? ""}
            onBlur={(e) => setSingle("priceMax", e.target.value)}
            className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm"
          />
        </div>
      </Section>

      <div className="py-4">
        <Check label={t("inStockOnly")} checked={!!sp.get("inStock")} onChange={() => setSingle("inStock", sp.get("inStock") ? "" : "1")} />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card py-2.5 text-sm font-medium md:hidden"
      >
        {t("filters")}
        {activeCount > 0 && (
          <span className="rounded-full bg-accent px-2 text-xs text-accent-foreground">{activeCount}</span>
        )}
      </button>

      <aside
        className={`${open ? "block" : "hidden"} md:block ${isPending ? "opacity-60" : ""} transition-opacity`}
      >
        {panel}
      </aside>
    </>
  );
}
