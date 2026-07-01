import Link from "next/link";
import { requireAdmin } from "@/auth";
import { getSettings } from "@/lib/settings";
import { updateSettings } from "@/lib/actions";

const field =
  "mt-1 w-full rounded-md border border-black/20 px-3 py-2 text-sm";
const labelCls = "block text-sm";

export default async function SettingsPage() {
  await requireAdmin();
  const s = await getSettings();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Store settings</h1>
        <Link href="/admin" className="text-sm text-black/60 hover:underline">
          ← Dashboard
        </Link>
      </div>

      <form action={updateSettings} className="max-w-2xl space-y-6">
        <fieldset className="rounded-lg border border-black/10 bg-white p-5">
          <legend className="px-1 text-sm font-medium">Storefront</legend>
          <div className="grid gap-4">
            <label className={labelCls}>
              <span className="text-neutral-700">Store name</span>
              <input name="storeName" defaultValue={s.storeName} className={field} />
            </label>
            <label className={labelCls}>
              <span className="text-neutral-700">Announcement banner</span>
              <input
                name="announcement"
                defaultValue={s.announcement}
                placeholder="e.g. New arrivals every Friday — closed for holidays Jun 28"
                className={field}
              />
              <span className="mt-1 block text-xs text-black/45">
                Shown across the top of the public site. Leave empty to hide it.
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-black/10 bg-white p-5">
          <legend className="px-1 text-sm font-medium">Contact</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              <span className="text-neutral-700">Email</span>
              <input
                name="contactEmail"
                type="email"
                defaultValue={s.contactEmail}
                className={field}
              />
            </label>
            <label className={labelCls}>
              <span className="text-neutral-700">Phone</span>
              <input name="contactPhone" defaultValue={s.contactPhone} className={field} />
            </label>
            <label className={labelCls}>
              <span className="text-neutral-700">Instagram username</span>
              <div className="mt-1 flex items-center rounded-md border border-black/20 px-3 text-sm focus-within:border-black/50">
                <span className="text-black/40">@</span>
                <input
                  name="contactInstagram"
                  defaultValue={s.contactInstagram}
                  className="w-full bg-transparent py-2 pl-1 outline-none"
                />
              </div>
            </label>
            <label className={labelCls}>
              <span className="text-neutral-700">Address</span>
              <input name="contactAddress" defaultValue={s.contactAddress} className={field} />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>
              <span className="text-neutral-700">Opening hours</span>
              <input
                name="contactHours"
                defaultValue={s.contactHours}
                placeholder="e.g. Mon–Fri 10–18, Sat 10–14"
                className={field}
              />
            </label>
          </div>
        </fieldset>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}
