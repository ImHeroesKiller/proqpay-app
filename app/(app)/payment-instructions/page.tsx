export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireModule } from "@/lib/auth/session";
import { getPaymentInstructions } from "@/lib/data/queries";
import { formatRupiah } from "@/lib/utils";
import { fundingModelLabel } from "@/lib/domain/workflow";

export default async function PaymentInstructionsPage() {
  const scope = await requireModule("payment_instructions");
  const instructions = await getPaymentInstructions(scope);

  return (
    <div>
      <PageHeader
        title="Payment instructions"
        description="Payment instructions are generated after approval. Execution uses the selected funding model. Banking integration status is currently simulated — no live bank API is claimed."
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
                  <Badge variant="outline">{pi.integrationStatus}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pi.executionType.replaceAll("_", " ")} ·{" "}
                  {pi.sourceBankLabel ?? "Source account TBD"} ·{" "}
                  {pi.totalRecords} records · {formatRupiah(pi.totalAmount)}
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
