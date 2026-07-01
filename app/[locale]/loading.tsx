import { VinylMark } from "@/components/logo";

export default function Loading() {
  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center">
      <VinylMark className="h-10 w-10 animate-spin opacity-60" />
      <span className="sr-only">…</span>
    </div>
  );
}
