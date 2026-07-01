"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">{t("errorTitle")}</h1>
      <p className="mt-3 text-muted-foreground">{t("errorText")}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        {t("retry")}
      </button>
    </div>
  );
}
