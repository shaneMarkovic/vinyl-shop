import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/site";
import "../globals.css";

// `latin-ext` covers Serbian latinica diacritics: č ć š ž đ.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "SOFT", "WONK"],
});
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const [t, { storeName }] = await Promise.all([
    getTranslations({ locale, namespace: "meta" }),
    getSettings(),
  ]);
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t("title", { storeName }),
      // Pages that set their own title (e.g. a record) get "Title · Store".
      template: `%s · ${storeName}`,
    },
    description: t("description"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Root layout for the public site. There is intentionally NO app/layout.tsx:
// this and app/admin/layout.tsx are separate root layouts (each owns its own
// <html>/<body>), which is the supported way to give the two trees different
// document shells.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const fontVars = `${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${spaceGrotesk.variable}`;

  const { announcement } = await getSettings();

  return (
    <html lang={locale} data-theme="analog" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider>
          {announcement && (
            <div className="bg-accent px-4 py-2 text-center text-sm text-accent-foreground">
              {announcement}
            </div>
          )}
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
