import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // sr = Serbian (latinica). en = English.
  locales: ["sr", "en"],
  defaultLocale: "sr",
});

export type Locale = (typeof routing.locales)[number];
