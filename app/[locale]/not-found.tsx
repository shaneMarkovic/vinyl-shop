import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="mt-3 text-muted-foreground">{t("notFoundText")}</p>
      <Link
        href="/catalog"
        className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        {t("browseCatalog")}
      </Link>
    </div>
  );
}
