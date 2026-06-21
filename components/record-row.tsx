import { RecordCard } from "./record-card";
import type { CatalogItem } from "@/lib/records";

/** Horizontally scrollable row of record cards (mobile-friendly crate-flip). */
export function RecordRow({ items }: { items: CatalogItem[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-5">
        {items.map((record) => (
          <div key={record.id} className="w-44 shrink-0 sm:w-52">
            <RecordCard record={record} />
          </div>
        ))}
      </div>
    </div>
  );
}
