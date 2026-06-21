"use client";

import { useState, useEffect } from "react";
import { THEMES, DEFAULT_THEME, THEME_COOKIE, type ThemeId } from "@/lib/theme";

// Live theme toggle. Applies instantly (CSS vars swap) and persists to a cookie
// so the next SSR render keeps the choice. Built for evaluating directions —
// can be simplified/hidden once the client picks one.
export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const current = document.documentElement.dataset.theme as ThemeId | undefined;
    if (current) setTheme(current);
  }, []);

  function choose(id: ThemeId) {
    document.documentElement.dataset.theme = id;
    document.cookie = `${THEME_COOKIE}=${id};path=/;max-age=31536000;samesite=lax`;
    setTheme(id);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        {THEMES.find((t) => t.id === theme)?.label ?? "Theme"}
      </button>
      {open && (
        <ul
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-xl"
          role="listbox"
        >
          {THEMES.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => choose(t.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted ${
                  t.id === theme ? "font-semibold" : ""
                }`}
                role="option"
                aria-selected={t.id === theme}
              >
                <span className="h-3 w-3 rounded-full bg-accent" />
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
