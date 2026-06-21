import Link from "next/link";
import { getAllGenresWithCounts } from "@/lib/records";
import { GenreManager } from "@/components/admin/genre-manager";

export default async function GenresPage() {
  const genres = await getAllGenresWithCounts();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Genres</h1>
        <Link href="/admin" className="text-sm text-black/60 hover:underline">
          ← Dashboard
        </Link>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-black/55">
        Imported data often has near-duplicate or messy genre names. Rename to
        fix a label everywhere, or merge one genre into another to combine them.
      </p>
      <GenreManager genres={genres} />
    </div>
  );
}
