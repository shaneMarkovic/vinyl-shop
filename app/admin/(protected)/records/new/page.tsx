import Link from "next/link";
import { createRecord } from "@/lib/actions";
import { RecordForm } from "@/components/admin/record-form";

export default function NewRecordPage() {
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
