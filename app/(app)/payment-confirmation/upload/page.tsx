export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth/session";
import {
  canUploadProof,
  listInstructionsAwaitingProof,
} from "@/lib/data/confirmations";
import { UploadProofForm } from "@/components/payment-confirmation/upload-form";
import { formatRupiah } from "@/lib/utils";

export default async function UploadProofPage() {
  const scope = await requireModule("payment_confirmation");
  if (!canUploadProof(scope.role)) {
    redirect("/payment-confirmation");
  }

  const instructions = await listInstructionsAwaitingProof(scope);
  const options = instructions.map((i) => ({
    id: i.id,
    label: `${i.instructionNumber} · ${i.payrollPeriod.name} · ${formatRupiah(Number(i.totalAmount))}`,
    amount: Number(i.totalAmount),
  }));

  return (
    <div>
      <PageHeader
        title="Upload transfer proof"
        description="After the client transfers salaries from the client bank account, upload PDF/PNG/JPG proof (max 10 MB). Storage is private (signed URLs only)."
      />
      <UploadProofForm instructions={options} />
    </div>
  );
}
