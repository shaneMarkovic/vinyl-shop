export const THEMES = [
  { id: "analog", label: "Analog Warmth" },
  { id: "afterhours", label: "After Hours" },
  { id: "minimal", label: "Gallery Minimal" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "analog";
export const THEME_COOKIE = "vv-theme";

export function isThemeId(value: string | undefined): value is ThemeId {
  return !!value && THEMES.some((t) => t.id === value);
}
