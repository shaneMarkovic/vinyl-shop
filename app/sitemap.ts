import type { MetadataRoute } from "next";
import { db, records } from "@/db";
import { routing } from "@/i18n/routing";
import { languageAlternates, localizedUrl } from "@/lib/seo";

// Refresh hourly so newly imported records show up without a redeploy.
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

/** One entry per locale for `href`, each carrying its hreflang alternates. */
function localized(href: string, extra?: Partial<Entry>): Entry[] {
  const languages = languageAlternates(href);
  return routing.locales.map((locale) => ({
    url: localizedUrl(href, locale),
    alternates: { languages },
    ...extra,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await db
    .select({ id: records.id, updatedAt: records.updatedAt })
    .from(records);

  return [
    ...localized("/", { changeFrequency: "daily" }),
    ...localized("/catalog", { changeFrequency: "daily" }),
    ...localized("/contact", { changeFrequency: "monthly" }),
    ...rows.flatMap((r) =>
      localized(`/records/${r.id}`, { lastModified: r.updatedAt }),
    ),
  ];
}
