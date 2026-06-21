import { db, settings } from "@/db";

/**
 * Store-wide settings. Each key has a built-in default sourced from an env var
 * (the previous home for this config) so the storefront renders sensibly even
 * before anything is saved in the admin panel. The DB row, when present, wins.
 */
export type SettingKey =
  | "storeName"
  | "contactEmail"
  | "contactPhone"
  | "contactInstagram"
  | "contactAddress"
  | "contactHours"
  | "announcement";

export type StoreSettings = Record<SettingKey, string>;

const DEFAULTS: StoreSettings = {
  storeName: "Vinyl Vibe",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "shop@example.com",
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+381 00 000 0000",
  contactInstagram: process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM ?? "vinylstore",
  contactAddress: "",
  contactHours: "",
  announcement: "",
};

export const SETTING_KEYS = Object.keys(DEFAULTS) as SettingKey[];

/** Fetch all settings, merging saved DB rows over the env-backed defaults. */
export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.select().from(settings);
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out = { ...DEFAULTS };
  for (const key of SETTING_KEYS) {
    if (typeof saved[key] === "string") out[key] = saved[key];
  }
  return out;
}
