export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireModule } from "@/lib/auth/session";
import { getPaymentInstructions } from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";
import { fundingModelLabel } from "@/lib/domain/workflow";
import { executionModelLabel } from "@/lib/domain/confirmation";

export default async function PaymentInstructionsPage() {
  const scope = await requireModule("payment_instructions");
  const instructions = await getPaymentInstructions(scope);

  return (
    <div>
      <PageHeader
        title="Payment instructions"
        description="Generated after approval for the client to transfer salaries from the client bank account (self-transfer) or after WC funds are released to the client bank. ProQPay does not pay employees directly from a funding partner. Banking integration may be SIMULATED."
      />
      <div className="space-y-3">
        {instructions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payment instructions yet.
          </p>
        ) : null}
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
                  Next: client transfer → upload proof in Payment confirmation
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <StatusBadge status={pi.executionStatus} />
                <span className="text-xs text-muted-foreground">
                  Approval: {pi.approvalStatus}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
