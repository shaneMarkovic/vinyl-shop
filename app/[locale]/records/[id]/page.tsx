import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRecordById } from "@/lib/records";
import { publicUrl } from "@/lib/storage";
import { formatRsd, formatKey } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { pageAlternates } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

type Props = { params: Promise<{ locale: string; id: string }> };

type RecordDetail = NonNullable<Awaited<ReturnType<typeof getRecordById>>>;

/** Absolute cover URL, or undefined (JSON-LD and OG need absolute URLs). */
function coverUrlOf(record: RecordDetail): string | undefined {
  const cover = record.images[0];
  if (!cover) return undefined;
  const url = publicUrl(cover.key);
  return url.startsWith("/") ? `${siteUrl}${url}` : url;
}

/**
 * schema.org Product markup — this is what makes Google show price and
 * availability directly in search results. Call-for-price records get no
 * offer (there is no price to declare).
 */
function productJsonLd(record: RecordDetail): object {
  const hasPrice = !record.callForPrice && record.priceRsd != null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${record.artist} — ${record.title}`,
    image: coverUrlOf(record),
    description: record.description ?? undefined,
    sku: record.catalogNumber ?? undefined,
    category: "Vinyl record",
    offers: hasPrice
      ? {
          "@type": "Offer",
          price: record.priceRsd,
          priceCurrency: "RSD",
          availability:
            record.quantity > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition: record.isNew
            ? "https://schema.org/NewCondition"
            : "https://schema.org/UsedCondition",
        }
      : undefined,
  };
}

// getRecordById is wrapped in React cache(), so this shares the page's query.
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, id } = await props.params;
  const recordId = Number(id);
  const record = Number.isInteger(recordId) ? await getRecordById(recordId) : undefined;
  if (!record) return {};

  const title = `${record.artist} — ${record.title}`;
  const description = record.description?.slice(0, 160) || undefined;
  const cover = coverUrlOf(record);
  return {
    title,
    description,
    alternates: pageAlternates(`/records/${recordId}`, locale),
    openGraph: {
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}

export default async function RecordDetailPage(props: Props) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);

  const recordId = Number(id);
  if (!Number.isInteger(recordId)) notFound();

  const record = await getRecordById(recordId);
  if (!record) notFound();

  const [t, tf, { contactPhone: PHONE }] = await Promise.all([
    getTranslations("record"),
    getTranslations("formats"),
    getSettings(),
  ]);
  const inStock = record.quantity > 0;
  const cover = record.images[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        // Escape "<" so listing text can't break out of the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(record)).replace(/</g, "\\u003c"),
        }}
      />
      <Link href="/catalog" className="text-sm text-muted-foreground hover:text-accent">
        ← {t("backToCatalog")}
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-card border border-border bg-muted shadow-xl">
            {cover ? (
              <Image
                src={publicUrl(cover.key)}
                alt={`${record.artist} — ${record.title}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl text-muted-foreground">♪</div>
            )}
          </div>
          {record.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {record.images.slice(1).map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded border border-border">
                  <Image src={publicUrl(img.key)} alt="" fill sizes="20vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              inStock ? "bg-accent/90 text-accent-foreground" : "bg-foreground/55 text-background"
            }`}
          >
            {inStock ? t("inStock") : t("outOfStock")}
          </span>

          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">{record.artist}</h1>
          <p className="text-xl text-muted-foreground">{record.title}</p>

          {record.recordGenres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {record.recordGenres.map(({ genre }) => (
                <span key={genre.id} className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                  {genre.name}
                </span>
              ))}
            </div>
          )}

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <Spec label={t("condition")} value={t(record.isNew ? "new" : "used")} />
            {record.label && <Spec label={t("label")} value={record.label} />}
            {record.catalogNumber && <Spec label={t("catalogNumber")} value={record.catalogNumber} />}
            {record.year && <Spec label={t("year")} value={record.year} />}
            {record.country && <Spec label={t("country")} value={record.country} />}
            <Spec label={t("format")} value={tf(formatKey(record.format))} />
            {!record.isNew && record.conditionMedia && (
              <Spec label={t("media")} value={record.conditionMedia} />
            )}
            {!record.isNew && record.conditionSleeve && (
              <Spec label={t("sleeve")} value={record.conditionSleeve} />
            )}
          </dl>

          {record.description && (
            <p className="mt-6 whitespace-pre-line text-sm text-muted-foreground">{record.description}</p>
          )}

          <div className="mt-8 rounded-card border border-border bg-card p-5">
            <p className="font-display text-3xl font-semibold">
              {record.callForPrice || record.priceRsd == null ? t("callForPrice") : formatRsd(record.priceRsd)}
            </p>
            <a
              href={`tel:${PHONE.replace(/\s/g, "")}`}
              className="mt-4 inline-block rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              {t("callToOrder")} — {PHONE}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
