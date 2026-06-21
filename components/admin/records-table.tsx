"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { bulkDeleteRecords, bulkSetStock, bulkAdjustPrice } from "@/lib/actions";

export type AdminRow = {
  id: number;
  artist: string;
  title: string;
  format: string;
  isNew: boolean;
  conditionMedia: string | null;
  conditionSleeve: string | null;
  priceLabel: string;
  quantity: number;
  needsEnrichment: boolean;
  coverUrl: string | null;
};

const btn =
  "rounded-md border border-black/15 bg-white px-2.5 py-1 text-sm hover:bg-black/[0.03] disabled:opacity-50";

export function RecordsTable({ rows }: { rows: AdminRow[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const ids = [...selected];

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function run(fn: () => Promise<void>) {
    start(async () => {
      await fn();
      setSelected(new Set());
    });
  }

  function adjustPrice(mode: "set" | "delta" | "percent") {
    const label =
      mode === "set"
        ? "Set price to (RSD):"
        : mode === "delta"
          ? "Change price by (RSD, use - to lower):"
          : "Change price by (%, use - to lower):";
    const raw = window.prompt(label);
    if (raw == null) return;
    const amount = Number(raw.trim());
    if (!Number.isFinite(amount)) return;
    run(() => bulkAdjustPrice(ids, mode, amount));
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-neutral-100 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <span className="mx-1 h-4 w-px bg-black/15" />
          <button className={btn} disabled={pending} onClick={() => run(() => bulkSetStock(ids, true))}>
            Mark in stock
          </button>
          <button className={btn} disabled={pending} onClick={() => run(() => bulkSetStock(ids, false))}>
            Mark out of stock
          </button>
          <span className="mx-1 h-4 w-px bg-black/15" />
          <button className={btn} disabled={pending} onClick={() => adjustPrice("set")}>
            Set price…
          </button>
          <button className={btn} disabled={pending} onClick={() => adjustPrice("delta")}>
            ± RSD…
          </button>
          <button className={btn} disabled={pending} onClick={() => adjustPrice("percent")}>
            ± %…
          </button>
          <span className="mx-1 h-4 w-px bg-black/15" />
          <button
            className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Delete ${selected.size} record(s)? This cannot be undone.`))
                run(() => bulkDeleteRecords(ids));
            }}
          >
            Delete
          </button>
          <button
            className="ml-auto text-black/50 hover:text-black"
            disabled={pending}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-black/50">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allOnPage}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-2 font-medium">Cover</th>
              <th className="px-3 py-2 font-medium">Artist / Title</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Grade</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Stock</th>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-black/50">
                  No records match these filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-black/5 last:border-0 hover:bg-black/[0.02] ${selected.has(r.id) ? "bg-blue-50/60" : ""}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.artist} — ${r.title}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {r.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.coverUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded object-cover bg-black/5"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-black/5 text-black/30">
                        ♪
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium leading-tight">{r.artist}</div>
                    <div className="text-black/55 leading-tight">{r.title}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.format}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.isNew ? (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">New</span>
                    ) : (
                      <span className="text-black/70">
                        {r.conditionMedia ?? "?"}/{r.conditionSleeve ?? "?"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.priceLabel}</td>
                  <td className="px-3 py-2">
                    <span className={r.quantity > 0 ? "text-green-700" : "text-black/40"}>
                      {r.quantity}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {r.needsEnrichment ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Pending</span>
                    ) : (
                      <span className="rounded bg-black/5 px-1.5 py-0.5 text-xs text-black/60">Enriched</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/admin/records/${r.id}`} className="text-blue-600 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
