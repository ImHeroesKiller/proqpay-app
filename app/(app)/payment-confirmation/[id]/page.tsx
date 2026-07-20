export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkflowTimeline } from "@/components/payroll/workflow-timeline";
import { VerifyActions } from "@/components/payment-confirmation/verify-actions";
import { requireModule } from "@/lib/auth/session";
import {
  canVerifyProof,
  getPaymentConfirmationDetail,
} from "@/lib/data/confirmations";
import {
  buildConfirmationWorkflow,
  executionModelLabel,
  fundingFlowNote,
} from "@/lib/domain/confirmation";
import { formatRupiah } from "@/lib/utils";
import type { PayrollPeriod } from "@/types";

export default async function PaymentConfirmationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const scope = await requireModule("payment_confirmation");
  const { id } = await params;
  const detail = await getPaymentConfirmationDetail(id, scope);
  if (!detail) notFound();

  const periodForWorkflow: PayrollPeriod = {
    id: detail.period.id,
    name: detail.period.name,
    periodStart: detail.period.payDate,
    periodEnd: detail.period.payDate,
    payDate: detail.period.payDate,
    status: detail.period.status as PayrollPeriod["status"],
    fundingModel: detail.period.fundingModel,
    fundingStatus: detail.period.fundingStatus,
    paymentInstructionStatus: detail.period.paymentInstructionStatus,
    reconciliationStatus: detail.period.reconciliationStatus,
    confirmationStatus: detail.period.confirmationStatus,
    employeeCount: detail.period.employeeCount,
    totalGross: detail.period.totalGross,
    totalDeductions: 0,
    totalNet: detail.period.totalNet,
    createdAt: new Date().toISOString(),
  };

  const workflow = buildConfirmationWorkflow(
    periodForWorkflow,
    detail.status,
  );
  const showVerify =
    canVerifyProof(scope.role) &&
    ["UPLOADED", "UNDER_REVIEW", "NEED_REVISION"].includes(detail.status);

  return (
    <div>
      <PageHeader
        title={detail.confirmationNumber}
        description={`${detail.companyName} · ${detail.period.name}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/payment-confirmation">Back to list</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge status={detail.status} />
        <Badge variant="secondary">
          {executionModelLabel(detail.instruction.executionModel)}
        </Badge>
        <Badge variant="outline">{detail.period.fundingModel}</Badge>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        {fundingFlowNote(detail.period.fundingModel)}
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Payroll summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>Period · {detail.period.name}</p>
              <p>Pay date · {detail.period.payDate}</p>
              <p>Employees · {detail.period.employeeCount}</p>
              <p>Net payroll · {formatRupiah(detail.period.totalNet)}</p>
              <p>Payroll status · {detail.period.status}</p>
              <p>Gross · {formatRupiah(detail.period.totalGross)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment instruction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Number ·{" "}
                <Link
                  href="/payment-instructions"
                  className="text-msg-blue hover:underline"
                >
                  {detail.instruction.instructionNumber}
                </Link>
              </p>
              <p>
                Amount · {formatRupiah(detail.instruction.totalAmount)} ·{" "}
                {detail.instruction.totalRecords} records
              </p>
              <p>
                Execution ·{" "}
                {executionModelLabel(detail.instruction.executionModel)}
              </p>
              <p>
                Integration · {detail.instruction.integrationStatus} (not a live
                partner→employee rail)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transfer proof</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Paid {formatRupiah(detail.paymentAmount)} on {detail.paymentDate}
              </p>
              <p>
                Payer · {detail.payerAccountName} · {detail.payerBank} ·{" "}
                {detail.payerAccountMasked}
              </p>
              <p>Reference · {detail.referenceNumber}</p>
              {detail.notes ? <p>Notes · {detail.notes}</p> : null}
              {detail.rejectionReason ? (
                <p className="text-destructive">
                  Rejection · {detail.rejectionReason}
                </p>
              ) : null}
              <div className="space-y-2">
                {detail.files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <span>
                      {f.fileName} · {(f.fileSize / 1024).toFixed(1)} KB
                    </span>
                    {f.signedUrl ? (
                      <a
                        href={f.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-msg-blue hover:underline"
                      >
                        View (signed, 5 min)
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Signed URL unavailable
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {showVerify ? <VerifyActions confirmationId={detail.id} /> : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkflowTimeline steps={workflow} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verification history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Uploaded by · {detail.uploadedByName ?? "—"}</p>
              <p>Verified by · {detail.verifiedByName ?? "—"}</p>
              <p>
                Verified at ·{" "}
                {detail.verifiedAt
                  ? new Date(detail.verifiedAt).toLocaleString()
                  : "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events yet.</p>
              ) : null}
              {detail.audit.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md border border-border px-3 py-2 text-xs"
                >
                  <p className="font-medium">{a.action}</p>
                  <p className="text-muted-foreground">
                    {a.userName} · {new Date(a.timestamp).toLocaleString()}
                  </p>
                  {a.detail ? (
                    <p className="mt-0.5 text-muted-foreground">{a.detail}</p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
