import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

export function SiteHeader() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="Vinyl Vibe — home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/catalog" className="hover:text-accent transition-colors">
            {t("catalog")}
          </Link>
          <Link href="/contact" className="hover:text-accent transition-colors">
            {t("contact")}
          </Link>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <LanguageSwitcher />
          <ThemeSwitcher />
        </nav>
      </div>
    </header>
  );
}
