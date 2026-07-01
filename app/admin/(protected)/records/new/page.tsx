import Link from "next/link";
import { requireAdmin } from "@/auth";
import { createRecord } from "@/lib/actions";
import { RecordForm } from "@/components/admin/record-form";

export default async function NewRecordPage() {
  await requireAdmin();
  return (
    <div>
      <Link href="/admin" className="text-sm text-black/60 hover:underline">
        ← Back
      </Link>
      <h1 className="mb-6 mt-2 text-xl font-bold">Add record</h1>
      <RecordForm action={createRecord} />
    </div>
  );
}
