export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireModule } from "@/lib/auth/session";
import { listInstructions } from "@/lib/payout/instruction-service";
import { formatRupiah } from "@/lib/utils";
import { FileText } from "lucide-react";
import Link from "next/link";

export default async function PaymentInstructionsPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const scope = await requireModule("payment_instructions");
  const sp = await searchParams;
  const instructions = await listInstructions(scope, {
    phase: sp.phase,
    take: 50,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Payout control plane"
        title="Payment instructions"
        description="Maker creates DRAFT batches from locked payroll lines; checker approves before bank file generation (I2-B). No auto-approve."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant={sp.phase === "SUBMITTED" ? "accent" : "outline"}>
              <Link href="/payment-instructions?phase=SUBMITTED">
                Approval queue
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/payment-instructions">All batches</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/payroll">Payroll periods</Link>
            </Button>
          </div>
        }
      />

      {sp.phase === "SUBMITTED" ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Checker queue — batches awaiting approval. Maker cannot approve their own batch.
        </p>
      ) : null}

      {instructions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No payment batches"
          description="Create a payment batch from a locked payroll period with projected lines."
          guidance="Open payroll → lock period → Create payment batch."
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
                    <Link
                      href={`/payment-instructions/${pi.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {pi.instructionNumber}
                    </Link>
                    <Badge variant="secondary">{pi.controlPhase}</Badge>
                    <Badge variant="outline">
                      {pi.approvalStatus}
                    </Badge>
                    <Badge variant="outline">{pi.executionStatus}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pi.payrollPeriod?.name ?? "—"} · {pi.company?.name ?? "—"} ·{" "}
                    {pi._count.items} items · {formatRupiah(pi.totalAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maker: {pi.maker?.name ?? "—"}
                    {pi.checker?.name ? ` · Checker: ${pi.checker.name}` : ""}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/payment-instructions/${pi.id}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
