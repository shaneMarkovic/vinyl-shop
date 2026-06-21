import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSettings } from "@/lib/settings";

export default async function ContactPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const s = await getSettings();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
      <p className="text-foreground/80 mb-8">{t("orderNote")}</p>
      <dl className="space-y-3 text-sm">
        <div className="flex gap-2">
          <dt className="w-24 font-medium">{t("phone")}</dt>
          <dd>
            <a
              href={`tel:${s.contactPhone.replace(/\s/g, "")}`}
              className="hover:underline"
            >
              {s.contactPhone}
            </a>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 font-medium">{t("instagram")}</dt>
          <dd>
            <a
              href={`https://instagram.com/${s.contactInstagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              @{s.contactInstagram}
            </a>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 font-medium">{t("email")}</dt>
          <dd>
            <a href={`mailto:${s.contactEmail}`} className="hover:underline">
              {s.contactEmail}
            </a>
          </dd>
        </div>
        {s.contactAddress && (
          <div className="flex gap-2">
            <dt className="w-24 font-medium">{t("address")}</dt>
            <dd>{s.contactAddress}</dd>
          </div>
        )}
        {s.contactHours && (
          <div className="flex gap-2">
            <dt className="w-24 font-medium">{t("hours")}</dt>
            <dd>{s.contactHours}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
