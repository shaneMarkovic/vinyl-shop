import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    // Serve record images from the R2 public bucket / CDN domain.
    remotePatterns: [
      {
        protocol: "https",
        // Strip any scheme/trailing slash so this is a bare hostname.
        hostname:
          (process.env.NEXT_PUBLIC_R2_PUBLIC_HOST ?? "*.r2.dev")
            .replace(/^https?:\/\//, "")
            .replace(/\/$/, ""),
      },
      // Kupindo listing images (hotlinked on first import; a later enrichment
      // pass copies them into R2).
      { protocol: "https", hostname: "static.kupindoslike.com" },
    ],
    // Demo placeholder covers are SVGs we generate ourselves (trusted).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
  experimental: {
    // Admin image uploads go through a server action; raise the default 1MB cap.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default withNextIntl(nextConfig);
