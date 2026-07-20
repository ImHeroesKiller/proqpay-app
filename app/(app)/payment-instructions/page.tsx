export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireModule } from "@/lib/auth/session";
import { getPaymentInstructions } from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";
import { fundingModelLabel } from "@/lib/domain/workflow";
import { executionModelLabel } from "@/lib/domain/confirmation";
import { Download, FileText } from "lucide-react";
import Link from "next/link";

export default async function PaymentInstructionsPage() {
  const scope = await requireModule("payment_instructions");
  const instructions = await getPaymentInstructions(scope);

  return (
    <div>
      <PageHeader
        eyebrow="Payroll operations"
        title="Payment instructions"
        description="Generated after approval for the client to transfer salaries from the client bank account (self-transfer) or after WC funds are released to the client bank. ProQPay does not pay employees directly from a funding partner."
      />

      {instructions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No payment instructions yet"
          description="Instructions appear after a payroll period is approved and generation is run."
          guidance="Open an approved payroll period and generate a payment instruction, then download the CSV for client bank transfer."
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/payroll">Go to payroll</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {instructions.map((pi) => (
            <Card key={pi.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{pi.instructionNumber}</p>
                    <Badge variant="secondary">
                      {fundingModelLabel(pi.fundingModel)}
                    </Badge>
                    <Badge variant="outline">
                      {executionModelLabel(pi.executionModel)}
                    </Badge>
                    <Badge variant="outline">{pi.integrationStatus}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pi.executionType.replaceAll("_", " ")} ·{" "}
                    {pi.sourceBankLabel ?? "Client source account"} ·{" "}
                    {pi.totalRecords} records · {formatRupiah(pi.totalAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    What happens next: client transfer → upload proof in Payment
                    confirmation
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <StatusBadge status={pi.executionStatus} />
                  <span className="text-xs text-muted-foreground">
                    Approval: {pi.approvalStatus}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/payment-instructions/${pi.id}/download`}>
                      <Download className="h-3.5 w-3.5" />
                      Download CSV
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
