export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayrollLinesTable } from "@/components/payroll/payroll-lines-table";
import { WorkflowTimeline } from "@/components/payroll/workflow-timeline";
import {
  getPayrollLines,
  getPayrollPeriodById,
} from "@/lib/data/queries";
import { requireModule } from "@/lib/auth/session";
import { formatRupiah } from "@/lib/utils";
import {
  buildPayrollWorkflow,
  fundingModelDescription,
  fundingModelLabel,
} from "@/lib/domain/workflow";
import { PayrollPeriodActions } from "@/components/payroll/payroll-actions";

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const scope = await requireModule("payroll");
  const { id } = await params;
  const period = await getPayrollPeriodById(id, scope);

  if (!period) {
    notFound();
  }

  const lines = await getPayrollLines(period.id);
  const workflow = buildPayrollWorkflow(period);

  return (
    <div>
      <PageHeader
        title={period.name}
        description="Indonesian payroll run: recalculate (BPJS/PPh21 TER simplified), submit approval, generate payment instruction, then client transfer + proof."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/payroll">Back</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/payment-instructions">Instructions</Link>
            </Button>
            <Button asChild variant="accent" size="sm">
              <Link href="/payment-confirmation">Confirmation</Link>
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <PayrollPeriodActions
          periodId={period.id}
          status={period.status}
          companyId={period.companyId}
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={period.status} />
        <Badge variant="secondary">
          {fundingModelLabel(period.fundingModel)}
        </Badge>
        <Badge variant="outline">PI: {period.paymentInstructionStatus}</Badge>
        <Badge variant="outline">Funding: {period.fundingStatus}</Badge>
        <Badge variant="outline">Recon: {period.reconciliationStatus}</Badge>
        <span className="text-sm text-muted-foreground">
          Pay date {period.payDate}
        </span>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Execution workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {fundingModelDescription(period.fundingModel)}
            </p>
            <WorkflowTimeline steps={workflow} />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Source of funds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Model · </span>
                {fundingModelLabel(period.fundingModel)}
              </p>
              <p>
                <span className="text-muted-foreground">Account · </span>
                {period.sourceBankLabel ??
                  (period.fundingModel === "SELF_FUNDED"
                    ? "Client payroll source (masked)"
                    : "Funding allocation path")}
              </p>
              <p>
                <span className="text-muted-foreground">Execution · </span>
                {(period.executionType ?? "CLIENT_BANK_TRANSFER").replaceAll(
                  "_",
                  " ",
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>Gross · {formatRupiah(period.totalGross)}</p>
              <p>Deductions · {formatRupiah(period.totalDeductions)}</p>
              <p className="font-semibold">
                Net · {formatRupiah(period.totalNet)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <PayrollLinesTable data={lines} />
    </div>
  );
}
