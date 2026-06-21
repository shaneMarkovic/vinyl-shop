import "./globals.css";

// Root layout is a pass-through; the real <html> is rendered per-locale in
// app/[locale]/layout.tsx so we can set `lang` and provide translations.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
