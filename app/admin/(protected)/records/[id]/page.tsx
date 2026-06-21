import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecordById } from "@/lib/records";
import { publicUrl } from "@/lib/storage";
import {
  updateRecord,
  deleteRecord,
  setCoverImage,
  deleteImage,
  uploadImage,
} from "@/lib/actions";
import { RecordForm } from "@/components/admin/record-form";
import { ImagePicker } from "@/components/admin/image-picker";

export default async function EditRecordPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const recordId = Number(id);
  if (!Number.isInteger(recordId)) notFound();

  const record = await getRecordById(recordId);
  if (!record) notFound();

  const update = updateRecord.bind(null, recordId);
  const remove = deleteRecord.bind(null, recordId);
  const defaultGenres = record.recordGenres.map((rg) => rg.genre.name).join(", ");

  return (
    <div>
      <Link href="/admin" className="text-sm text-black/60 hover:underline">
        ← Back to records
      </Link>
      <div className="mb-6 mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{record.artist}</h1>
          <p className="text-black/55">{record.title}</p>
        </div>
        <form action={remove}>
          <button className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            Delete record
          </button>
        </form>
      </div>

      <RecordForm action={update} record={record} defaultGenres={defaultGenres} />

      {/* Image manager */}
      <div className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/60">
          Images ({record.images.length})
        </h2>
        <form action={uploadImage.bind(null, recordId)} className="mb-6">
          <ImagePicker />
          <button className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            Upload selected
          </button>
        </form>
        {record.images.length === 0 ? (
          <p className="text-sm text-black/45">No images yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {record.images.map((img) => (
              <div key={img.id} className="overflow-hidden rounded-lg border border-black/10 bg-white">
                <div className="relative aspect-square bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicUrl(img.key)} alt="" className="h-full w-full object-cover" />
                  {img.isCover && (
                    <span className="absolute left-1 top-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Cover
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 p-1.5 text-xs">
                  {img.isCover ? (
                    <span className="text-black/40">★ cover</span>
                  ) : (
                    <form action={setCoverImage.bind(null, recordId, img.id)}>
                      <button className="text-blue-600 hover:underline">Set cover</button>
                    </form>
                  )}
                  <form action={deleteImage.bind(null, recordId, img.id)}>
                    <button className="text-red-600 hover:underline">Delete</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
