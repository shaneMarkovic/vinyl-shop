import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin · Vinyl Vibe",
};

// Admin is outside the [locale] segment, so it needs its own <html>/<body>
// (the public site gets these from app/[locale]/layout.tsx). No auth guard here
// — that lives in (protected)/layout.tsx so /admin/login stays accessible.
// data-theme="minimal" gives a clean, neutral admin chrome with no paper grain.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="minimal">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
