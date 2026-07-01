import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { getSettings } from "@/lib/settings";

// Contact details come from store settings (admin panel, DB-backed) so they can
// be changed live without touching code or restarting the server.
export async function SiteFooter() {
  const [t, settings] = await Promise.all([
    getTranslations("contact"),
    getSettings(),
  ]);
  const PHONE = settings.contactPhone;
  const INSTAGRAM = settings.contactInstagram;
  const EMAIL = settings.contactEmail;

  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Logo />
        <p className="mt-4 max-w-md font-medium">{t("orderNote")}</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="hover:text-accent">
            {t("phone")}: {PHONE}
          </a>
          <a
            href={`https://instagram.com/${INSTAGRAM}`}
            className="hover:text-accent"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("instagram")}: @{INSTAGRAM}
          </a>
          <a href={`mailto:${EMAIL}`} className="hover:text-accent">
            {t("email")}: {EMAIL}
          </a>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.storeName}
        </p>
      </div>
    </footer>
  );
}
