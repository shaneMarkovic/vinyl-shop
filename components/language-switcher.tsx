"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const LOCALES: { code: Locale; label: string }[] = [
  { code: "sr", label: "SR" },
  { code: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  // Keep active filters/search when switching language. Read at click time
  // (not via useSearchParams) so the header stays statically prerenderable.
  const switchTo = (code: Locale) =>
    router.replace(`${pathname}${window.location.search}`, { locale: code });

  return (
    <div className="flex items-center gap-1 text-sm">
      {LOCALES.map(({ code, label }, i) => (
        <span key={code} className="flex items-center gap-1">
          {i > 0 && <span className="text-foreground/30">/</span>}
          <button
            onClick={() => switchTo(code)}
            className={
              code === locale
                ? "font-semibold underline underline-offset-4"
                : "text-foreground/60 hover:text-foreground"
            }
            aria-current={code === locale ? "true" : undefined}
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}
