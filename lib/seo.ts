import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { siteUrl } from "@/lib/site";

/** Absolute URL of `href` (a locale-unprefixed app path) in the given locale. */
export function localizedUrl(href: string, locale: string): string {
  return siteUrl + getPathname({ href, locale: locale as Locale });
}

/** locale → absolute URL map for `href`, plus x-default (the default locale). */
export function languageAlternates(href: string): Record<string, string> {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, localizedUrl(href, l)]),
  );
  languages["x-default"] = languages[routing.defaultLocale];
  return languages;
}

/**
 * Canonical + hreflang annotations for a public page. The canonical is the
 * clean localized URL — query params (filters, pagination) are deliberately
 * not part of it, so filtered catalog views don't index as duplicates.
 */
export function pageAlternates(
  href: string,
  locale: string,
): Metadata["alternates"] {
  return {
    canonical: localizedUrl(href, locale),
    languages: languageAlternates(href),
  };
}
