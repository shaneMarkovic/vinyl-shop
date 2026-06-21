import type { Record } from "@/db/schema";

const FORMATS = ["LP", "2xLP", '7"', '10"', '12"', "other"];
const CONDITIONS = ["5", "5-", "4+", "4", "4-", "3+", "3", "3-", "2", "1"];

const field = "mt-1 w-full rounded-md border border-black/20 px-3 py-2 text-sm";
const labelCls = "block text-sm";

export function RecordForm({
  action,
  record,
  defaultGenres = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  record?: Record;
  defaultGenres?: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          <span className="text-neutral-700">Artist *</span>
          <input name="artist" required defaultValue={record?.artist ?? ""} className={field} />
        </label>
        <label className={labelCls}>
          <span className="text-neutral-700">Title *</span>
          <input name="title" required defaultValue={record?.title ?? ""} className={field} />
        </label>
        <label className={labelCls}>
          <span className="text-neutral-700">Label</span>
          <input name="label" defaultValue={record?.label ?? ""} className={field} />
        </label>
        <label className={labelCls}>
          <span className="text-neutral-700">Catalog number</span>
          <input name="catalogNumber" defaultValue={record?.catalogNumber ?? ""} className={field} />
        </label>
        <label className={labelCls}>
          <span className="text-neutral-700">Year</span>
          <input name="year" type="number" defaultValue={record?.year ?? ""} className={field} />
        </label>
        <label className={labelCls}>
          <span className="text-neutral-700">Country</span>
          <input name="country" defaultValue={record?.country ?? ""} className={field} />
        </label>
        <label className={labelCls}>
          <span className="text-neutral-700">Format</span>
          <select name="format" defaultValue={record?.format ?? "LP"} className={field}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          <span className="text-neutral-700">Quantity</span>
          <input name="quantity" type="number" min={0} defaultValue={record?.quantity ?? 0} className={field} />
        </label>
      </div>

      <fieldset className="rounded-md border border-black/10 p-4">
        <legend className="px-1 text-sm font-medium">Condition (used records)</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isNew" defaultChecked={record?.isNew ?? false} />
          This is a new (sealed) record — skip grading
        </label>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            <span className="text-neutral-700">Media grade</span>
            <select name="conditionMedia" defaultValue={record?.conditionMedia ?? ""} className={field}>
              <option value="">—</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            <span className="text-neutral-700">Sleeve grade</span>
            <select name="conditionSleeve" defaultValue={record?.conditionSleeve ?? ""} className={field}>
              <option value="">—</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>
          <span className="text-neutral-700">Price (RSD)</span>
          <input name="priceRsd" type="number" step="1" min={0} defaultValue={record?.priceRsd ?? ""} className={field} />
        </label>
        <label className="flex items-center gap-2 text-sm sm:mt-7">
          <input type="checkbox" name="callForPrice" defaultChecked={record?.callForPrice ?? false} />
          Call for price (hide price)
        </label>
      </div>

      <label className={labelCls}>
        <span className="text-neutral-700">Genres</span>
        <input name="genres" defaultValue={defaultGenres} placeholder="Rock, Jazz, Funk / Soul" className={field} />
        <span className="mt-1 block text-xs text-black/45">Comma-separated. Records can have multiple genres.</span>
      </label>

      <label className={labelCls}>
        <span className="text-neutral-700">Description (Serbian)</span>
        <textarea name="description" rows={4} defaultValue={record?.description ?? ""} className={field} />
      </label>

      <button type="submit" className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white">
        Save
      </button>
    </form>
  );
}
