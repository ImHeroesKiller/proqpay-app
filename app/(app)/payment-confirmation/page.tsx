export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireModule } from "@/lib/auth/session";
import {
  canUploadProof,
  listPaymentConfirmations,
} from "@/lib/data/confirmations";
import { formatRupiah } from "@/lib/utils";
import { executionModelLabel } from "@/lib/domain/confirmation";

export default async function PaymentConfirmationPage() {
  const scope = await requireModule("payment_confirmation");
  const rows = await listPaymentConfirmations(scope);
  const canUpload = canUploadProof(scope.role);

  return (
    <div>
      <PageHeader
        title="Payment confirmation"
        description="Payroll Confirmation Engine — client transfers from the client bank account, then uploads proof. ProQPay verifies before payroll is closed. Funds never go partner → employee."
        actions={
          canUpload ? (
            <Button asChild variant="accent" size="sm">
              <Link href="/payment-confirmation/upload">Upload proof</Link>
            </Button>
          ) : null
        }
      />

      <div className="space-y-3">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No payment confirmations yet. After a payment instruction is
              generated, the client transfers salaries and uploads proof here.
            </CardContent>
          </Card>
        ) : null}
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/payment-confirmation/${r.id}`}
                    className="font-semibold text-msg-blue hover:underline dark:text-sky-300"
                  >
                    {r.confirmationNumber}
                  </Link>
                  <Badge variant="outline">{r.periodName}</Badge>
                  <Badge variant="secondary">
                    {executionModelLabel(r.executionModel)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.companyName} · Instruction {r.instructionNumber} ·{" "}
                  {formatRupiah(r.paymentAmount)} · Transfer {r.paymentDate}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ref {r.referenceNumber} · Uploaded by{" "}
                  {r.uploadedByName ?? "—"}
                  {r.verifiedByName ? ` · Verified by ${r.verifiedByName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                <Button asChild variant="outline" size="sm">
                  <Link href={`/payment-confirmation/${r.id}`}>Open</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
