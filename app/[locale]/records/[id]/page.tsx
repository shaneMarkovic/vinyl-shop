import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getRecordById } from "@/lib/records";
import { publicUrl } from "@/lib/storage";
import { formatRsd, formatLabel } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export default async function RecordDetailPage(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);

  const recordId = Number(id);
  if (!Number.isInteger(recordId)) notFound();

  const record = await getRecordById(recordId);
  if (!record) notFound();

  const t = await getTranslations("record");
  const PHONE = (await getSettings()).contactPhone;
  const inStock = record.quantity > 0;
  const cover = record.images[0];

  const Spec = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
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
            <Spec label={t("format")} value={formatLabel(record.format)} />
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
