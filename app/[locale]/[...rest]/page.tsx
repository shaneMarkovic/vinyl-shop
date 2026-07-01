import { notFound } from "next/navigation";

// Catch-all: unmatched public routes render the localized not-found page
// instead of Next's bare default 404.
export default function CatchAllPage() {
  notFound();
}
