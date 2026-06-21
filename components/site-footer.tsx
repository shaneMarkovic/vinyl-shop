import { useTranslations } from "next-intl";
import { Logo } from "./logo";

// Contact details come from public env vars so the client can change them
// without touching code.
const PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+381 00 000 0000";
const INSTAGRAM = process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM ?? "vinylvibe";
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "shop@vinylvibe.rs";

export function SiteFooter() {
  const t = useTranslations("contact");

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
          © {new Date().getFullYear()} Vinyl Vibe
        </p>
      </div>
    </footer>
  );
}
