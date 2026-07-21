export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { requireModule } from "@/lib/auth/session";
import { getInstruction } from "@/lib/payout/instruction-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";
import { PayoutBatchActions } from "@/components/payout/payout-batch-actions";

export default async function PaymentInstructionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const scope = await requireModule("payment_instructions");
  const { id } = await params;

  let instruction;
  try {
    instruction = await getInstruction(scope, id);
  } catch {
    notFound();
  }

  const phase = instruction.controlPhase;
  const timeline = [
    {
      key: "DRAFT",
      label: "Draft",
      done: true,
    },
    {
      key: "SUBMITTED",
      label: "Submitted",
      done: ["SUBMITTED", "APPROVED", "IN_EXECUTION"].includes(phase),
    },
    {
      key: "APPROVED",
      label: "Approved",
      done: phase === "APPROVED" || phase === "IN_EXECUTION",
    },
    {
      key: "READY",
      label: "Ready for bank file",
      done:
        instruction.approvalStatus === "APPROVED" &&
        instruction.executionStatus === "READY",
    },
  ];
  if (phase === "REJECTED") {
    timeline.push({ key: "REJECTED", label: "Rejected", done: true });
  }
  if (phase === "CANCELLED") {
    timeline.push({ key: "CANCELLED", label: "Cancelled", done: true });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Payout control plane"
        title={instruction.instructionNumber}
        description="Maker creates and submits; checker approves. Amounts are snapshots from locked PayrollLine (ADR-001)."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/payment-instructions">Back to list</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary">Phase: {phase}</Badge>
        <Badge variant="outline">Approval: {instruction.approvalStatus}</Badge>
        <Badge variant="outline">Execution: {instruction.executionStatus}</Badge>
        <Badge variant="outline">v{instruction.version}</Badge>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">Status timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-wrap gap-2 text-xs">
            {timeline.map((s) => (
              <li
                key={s.key}
                className={`rounded-full border px-3 py-1 ${
                  s.done
                    ? "border-primary bg-primary/10 font-semibold"
                    : "border-border text-muted-foreground"
                }`}
              >
                {s.label}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs text-muted-foreground">
              Period
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 text-sm font-semibold">
            <Link
              href={`/payroll/${instruction.payrollPeriodId}`}
              className="text-primary hover:underline"
            >
              {instruction.payrollPeriod?.name}
            </Link>
            <p className="text-xs font-normal text-muted-foreground">
              {instruction.payrollPeriod?.status}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs text-muted-foreground">
              Totals invariant
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 text-xs">
            <p>Period: {formatRupiah(instruction.invariants.periodNet)}</p>
            <p>Lines: {formatRupiah(instruction.invariants.lineSum)}</p>
            <p>Items: {formatRupiah(instruction.invariants.itemSum)}</p>
            <Badge
              variant={instruction.invariants.ok ? "secondary" : "danger"}
              className="mt-1"
            >
              {instruction.invariants.ok ? "OK" : "MISMATCH"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs text-muted-foreground">
              Control actors
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 text-xs">
            <p>Maker: {instruction.maker?.name ?? instruction.generatedBy?.name ?? "—"}</p>
            <p>Checker: {instruction.checker?.name ?? "—"}</p>
            {instruction.rejectionReason ? (
              <p className="mt-1 text-destructive">
                Reject: {instruction.rejectionReason}
              </p>
            ) : null}
            {instruction.approvalComment ? (
              <p className="mt-1 text-muted-foreground">
                Note: {instruction.approvalComment}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <PayoutBatchActions
            instructionId={instruction.id}
            nextActions={instruction.nextActions}
          />
          {phase === "APPROVED" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Next (I2-B): generate bank file from this READY batch. CSV download
              available for preview.
            </p>
          ) : null}
          {(phase === "APPROVED" || phase === "SUBMITTED" || phase === "DRAFT") && (
            <div className="mt-3">
              <Button asChild size="sm" variant="outline">
                <a href={`/api/payment-instructions/${instruction.id}/download`}>
                  Download CSV preview
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Items ({instruction.items.length}) — PayrollLine snapshots
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2">Recipient</th>
                <th>Bank</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {instruction.items.map((it) => (
                <tr key={it.id} className="border-b border-border/50">
                  <td className="py-1.5 font-medium">{it.recipientName}</td>
                  <td>{it.bankCode ?? "—"}</td>
                  <td className="font-mono text-xs">{it.maskedAccountNumber}</td>
                  <td>{formatRupiah(Number(it.amount))}</td>
                  <td>
                    <Badge variant="outline">{it.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
