export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { ImportCenter } from "@/components/import/import-center";
import { listImportBatches, listImportCompanies } from "@/lib/import/actions";
import { IMPORT_TEMPLATES } from "@/lib/import/templates";
import { requireModule } from "@/lib/auth/session";

export default async function ImportPage() {
  await requireModule("import");
  let batches: Awaited<ReturnType<typeof listImportBatches>> = [];
  let companies: Awaited<ReturnType<typeof listImportCompanies>> = [];
  try {
    [batches, companies] = await Promise.all([
      listImportBatches(),
      listImportCompanies(),
    ]);
  } catch {
    batches = [];
  }

  return (
    <div>
      <PageHeader
        title="Bulk Import Center"
        description="Unduh template resmi, unggah Excel, validasi per baris, lalu commit ke master data."
      />
      <ImportCenter
        templates={IMPORT_TEMPLATES}
        initialBatches={batches}
        companies={companies}
      />
    </div>
  );
}
