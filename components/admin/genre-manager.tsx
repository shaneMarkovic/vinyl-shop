"use client";

import { useState, useTransition } from "react";
import { renameGenre, deleteGenre, mergeGenres } from "@/lib/actions";

export type GenreItem = { id: number; name: string; count: number };

const btn =
  "rounded-md border border-black/15 bg-white px-2 py-1 text-xs hover:bg-black/[0.03] disabled:opacity-50";

export function GenreManager({ genres }: { genres: GenreItem[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [mergeFrom, setMergeFrom] = useState<number | null>(null);
  const [pending, start] = useTransition();

  if (genres.length === 0) {
    return (
      <p className="rounded-lg border border-black/10 bg-white p-6 text-black/60">
        No genres yet. They appear here once records are tagged with them.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-black/10 text-left text-black/50">
          <tr>
            <th className="px-4 py-2 font-medium">Genre</th>
            <th className="px-4 py-2 font-medium">Records</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {genres.map((g) => (
            <tr key={g.id} className="border-b border-black/5 last:border-0">
              <td className="px-4 py-2">
                {editing === g.id ? (
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && name.trim()) {
                        start(() => renameGenre(g.id, name).then(() => setEditing(null)));
                      } else if (e.key === "Escape") {
                        setEditing(null);
                      }
                    }}
                    className="w-56 rounded-md border border-black/20 px-2 py-1 text-sm"
                  />
                ) : mergeFrom != null && mergeFrom !== g.id ? (
                  <span>{g.name}</span>
                ) : (
                  <span className="font-medium">{g.name}</span>
                )}
              </td>
              <td className="px-4 py-2 text-black/60">{g.count}</td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1.5">
                  {editing === g.id ? (
                    <>
                      <button
                        className={btn}
                        disabled={pending || !name.trim()}
                        onClick={() =>
                          start(() => renameGenre(g.id, name).then(() => setEditing(null)))
                        }
                      >
                        Save
                      </button>
                      <button className={btn} disabled={pending} onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </>
                  ) : mergeFrom === g.id ? (
                    <>
                      <span className="self-center text-xs text-black/50">
                        Pick a genre to merge “{g.name}” into…
                      </span>
                      <button className={btn} disabled={pending} onClick={() => setMergeFrom(null)}>
                        Cancel
                      </button>
                    </>
                  ) : mergeFrom != null ? (
                    <button
                      className={btn}
                      disabled={pending}
                      onClick={() =>
                        start(() => mergeGenres(mergeFrom, g.id).then(() => setMergeFrom(null)))
                      }
                    >
                      Merge into this
                    </button>
                  ) : (
                    <>
                      <button
                        className={btn}
                        disabled={pending}
                        onClick={() => {
                          setName(g.name);
                          setEditing(g.id);
                        }}
                      >
                        Rename
                      </button>
                      <button className={btn} disabled={pending} onClick={() => setMergeFrom(g.id)}>
                        Merge
                      </button>
                      <button
                        className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete genre “${g.name}”? It will be removed from ${g.count} record(s).`,
                            )
                          )
                            start(() => deleteGenre(g.id));
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
