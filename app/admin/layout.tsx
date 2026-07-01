import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Admin · Vinyl Vibe",
};

// Root layout for the admin tree. There is intentionally NO app/layout.tsx —
// this and app/[locale]/layout.tsx are separate root layouts (each owns its
// own <html>/<body>). No auth guard here — that lives in (protected)/layout.tsx
// so /admin/login stays accessible.
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
