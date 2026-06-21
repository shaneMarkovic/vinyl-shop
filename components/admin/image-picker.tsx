"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Item = { id: string; file: File; url: string };

let counter = 0;
const nextId = () => `${Date.now()}-${counter++}`;

/**
 * Client-side image picker used when creating a record. Supports drag-and-drop,
 * click-to-browse, thumbnail previews, removing a pick before upload, and
 * reordering (the first image becomes the cover). The selected files are kept
 * in sync with a hidden <input name="images"> so they submit with the form's
 * server action.
 */
export function ImagePicker({ name = "images" }: { name?: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  // Keep the hidden file input's FileList in sync with our ordered items so the
  // form submission carries exactly what's previewed, in this order.
  useEffect(() => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    for (const it of items) dt.items.add(it.file);
    inputRef.current.files = dt.files;
  }, [items]);

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => items.forEach((it) => URL.revokeObjectURL(it.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) return;
    setItems((prev) => [
      ...prev,
      ...imgs.map((file) => ({ id: nextId(), file, url: URL.createObjectURL(file) })),
    ]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const gone = prev.find((it) => it.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((it) => it.id !== id);
    });
  }, []);

  const reorder = useCallback((from: number, to: number) => {
    setItems((prev) => {
      if (from === to || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver
            ? "border-neutral-900 bg-neutral-900/5"
            : "border-black/20 hover:border-black/40 hover:bg-black/[0.02]"
        }`}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-2 text-black/40"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span className="text-sm font-medium text-neutral-700">
          Drag &amp; drop images here
        </span>
        <span className="mt-0.5 text-xs text-black/45">
          or click to browse — PNG, JPG, WebP
        </span>
      </div>

      {items.length > 0 && (
        <>
          <p className="mt-3 text-xs text-black/50">
            {items.length} image{items.length > 1 ? "s" : ""} selected. Drag to
            reorder — the first is the cover.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {items.map((it, i) => (
              <div
                key={it.id}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex.current !== null) reorder(dragIndex.current, i);
                  dragIndex.current = null;
                }}
                className="group relative overflow-hidden rounded-lg border border-black/10 bg-white"
              >
                <div className="relative aspect-square bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    aria-label="Remove image"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
