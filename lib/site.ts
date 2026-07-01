/**
 * Canonical origin of the deployed site — used for the sitemap, robots.txt,
 * and resolving relative Open Graph image URLs (metadataBase).
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
