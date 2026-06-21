import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getFeatured, getNewArrivals, getGenresWithCounts } from "@/lib/records";
import { publicUrl } from "@/lib/storage";
import { RecordRow } from "@/components/record-row";
import { VinylMark } from "@/components/logo";

const PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+381 00 000 0000";

export default async function HomePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const [featured, arrivals, genres, t, tc] = await Promise.all([
    getFeatured(),
    getNewArrivals(10),
    getGenresWithCounts(),
    getTranslations("home"),
    getTranslations("catalog"),
  ]);

  return (
    <div>
      {/* --- Hero ---------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-accent">
              <VinylMark className="h-5 w-5" />
              {t("kicker")}
            </p>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              {t("headline")}
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              {t("subhead")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                {t("browseCta")}
              </Link>
              <a
                href={`tel:${PHONE.replace(/\s/g, "")}`}
                className="rounded-full border border-border px-6 py-3 text-sm font-medium hover:border-accent"
              >
                {t("callCta")} — {PHONE}
              </a>
            </div>
          </div>

          {/* Featured record */}
          {featured && (
            <Link
              href={`/records/${featured.id}`}
              className="group relative mx-auto w-full max-w-sm"
            >
              <div className="relative aspect-square overflow-hidden rounded-card border border-border bg-muted shadow-2xl">
                {featured.coverKey ? (
                  <Image
                    src={publicUrl(featured.coverKey)}
                    alt={`${featured.artist} — ${featured.title}`}
                    fill
                    sizes="(max-width: 768px) 90vw, 400px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl text-muted-foreground">♪</div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.2em] text-accent">
                  {t("featured")}
                </p>
                <p className="font-display text-xl font-semibold">{featured.artist}</p>
                <p className="text-muted-foreground">{featured.title}</p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* --- New arrivals -------------------------------------------------- */}
      {arrivals.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold">{t("newArrivals")}</h2>
            <Link href="/catalog" className="text-sm text-accent hover:underline">
              {t("viewAll")} →
            </Link>
          </div>
          <RecordRow items={arrivals} />
        </section>
      )}

      {/* --- Browse by genre ---------------------------------------------- */}
      {genres.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="mb-6 font-display text-2xl font-semibold">{t("byGenre")}</h2>
          <div className="flex flex-wrap gap-3">
            {genres.map((g) => (
              <Link
                key={g.id}
                href={`/catalog?q=${encodeURIComponent(g.name)}`}
                className="rounded-full border border-border bg-card px-5 py-2.5 text-sm hover:border-accent hover:text-accent"
              >
                {g.name}{" "}
                <span className="text-muted-foreground">{g.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state when there's no data yet */}
      {arrivals.length === 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 text-center text-muted-foreground">
          {tc("noResults")}
        </section>
      )}
    </div>
  );
}
