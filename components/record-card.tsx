import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { publicUrl } from "@/lib/storage";
import { formatRsd } from "@/lib/format";
import type { CatalogItem } from "@/lib/records";

export function RecordCard({ record }: { record: CatalogItem }) {
  const t = useTranslations("record");

  return (
    <Link
      href={`/records/${record.id}`}
      className="group flex flex-col rounded-card border border-border bg-card overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-xl"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {record.coverKey ? (
          <Image
            src={publicUrl(record.coverKey)}
            alt={`${record.artist} — ${record.title}`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">
            ♪
          </div>
        )}
        <span
          className={`absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-[11px] font-medium backdrop-blur ${
            record.inStock
              ? "bg-accent/90 text-accent-foreground"
              : "bg-foreground/55 text-background"
          }`}
        >
          {record.inStock ? t("inStock") : t("outOfStock")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 p-3.5">
        <p className="font-display text-[15px] font-semibold leading-tight">
          {record.artist}
        </p>
        <p className="text-sm text-muted-foreground leading-tight line-clamp-1">
          {record.title}
        </p>
        <div className="mt-3 flex items-center justify-between pt-1 text-xs">
          <span className="uppercase tracking-wide text-muted-foreground">
            {record.isNew ? t("new") : t("used")}
          </span>
          <span className="font-semibold text-foreground">
            {record.callForPrice || record.priceRsd == null
              ? t("callForPrice")
              : formatRsd(record.priceRsd)}
          </span>
        </div>
      </div>
    </Link>
  );
}
