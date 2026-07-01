import Link from "next/link";
import { requireAdmin, signOut } from "@/auth";

// Guards every page in the (protected) group. /admin/login lives OUTSIDE this
// group, so there's no redirect loop. Each page also calls requireAdmin()
// itself — don't rely on the layout alone to protect new pages.
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="font-bold">
              Admin · Vinyl Vibe
            </Link>
            <Link href="/admin/records" className="text-sm text-black/60 hover:text-black">
              Records
            </Link>
            <Link href="/admin/genres" className="text-sm text-black/60 hover:text-black">
              Genres
            </Link>
            <Link href="/admin/issues" className="text-sm text-black/60 hover:text-black">
              Data issues
            </Link>
            <Link href="/admin/settings" className="text-sm text-black/60 hover:text-black">
              Settings
            </Link>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button className="text-sm text-black/60 hover:text-black">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
