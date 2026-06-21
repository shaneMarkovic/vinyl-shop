"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AdminPagination({ page, totalPages }: { page: number; totalPages: number }) {
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

  const btn =
    "min-w-9 rounded-md border border-black/20 bg-white px-3 py-1.5 text-sm hover:border-black/50 disabled:opacity-40";

  return (
    <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
      <button className={btn} onClick={() => go(page - 1)} disabled={page <= 1}>‹ Prev</button>
      <span className="px-2 text-black/60">Page {page} of {totalPages}</span>
      <button className={btn} onClick={() => go(page + 1)} disabled={page >= totalPages}>Next ›</button>
    </nav>
  );
}
