"use client";

import { useRef, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

type SortOption = { value: string; label: string };

export function CatalogSearchBar({
  resultsLabel,
  sortLabel,
  searchPlaceholder,
  sortOptions,
}: {
  resultsLabel: string;
  sortLabel: string;
  searchPlaceholder: string;
  sortOptions: SortOption[];
}) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(sp.toString());
    mutate(params);
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function onSearch(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      push((p) => (value ? p.set("q", value) : p.delete("q")));
    }, 300);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <input
        type="search"
        defaultValue={sp.get("q") ?? ""}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className="min-w-[200px] flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-ring"
      />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        {sortLabel}
        <select
          value={sp.get("sort") ?? "newest"}
          onChange={(e) => push((p) => p.set("sort", e.target.value))}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <span className="w-full text-sm text-muted-foreground sm:w-auto">{resultsLabel}</span>
    </div>
  );
}
