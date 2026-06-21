"use client";

import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

/** URL-driven pager. Builds page links that preserve all active filters. */
export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  if (totalPages <= 1) return null;

  function go(p: number) {
    const params = new URLSearchParams(sp.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  }

  // Compact window around the current page.
  const pages: (number | "…")[] = [];
  const add = (p: number) => pages.push(p);
  add(1);
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) add(p);
  if (end < totalPages - 1) pages.push("…");
  if (totalPages > 1) add(totalPages);

  const btn = "min-w-9 rounded-md border border-border px-3 py-1.5 text-sm hover:border-accent disabled:opacity-40 disabled:hover:border-border";

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button className={btn} onClick={() => go(page - 1)} disabled={page <= 1}>
        ‹
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${btn} ${p === page ? "bg-accent text-accent-foreground border-accent" : ""}`}
          >
            {p}
          </button>
        ),
      )}
      <button className={btn} onClick={() => go(page + 1)} disabled={page >= totalPages}>
        ›
      </button>
    </nav>
  );
}
