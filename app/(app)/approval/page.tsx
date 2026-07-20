export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApprovalStepActions } from "@/components/approval/approval-actions";
import {
  getApprovalSteps,
  getPayrollPeriods,
} from "@/lib/data/queries";
import { requireModule } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { Check, Circle, X } from "lucide-react";

export default async function ApprovalPage() {
  const scope = await requireModule("approval");
  const periods = await getPayrollPeriods(scope);
  const period =
    periods.find((p) => p.status === "WAITING") ??
    periods.find((p) => p.status === "APPROVED") ??
    periods[0];
  const steps = period ? await getApprovalSteps(period.id) : [];

  return (
    <div>
      <PageHeader
        title="Approval workflow"
        description="Multi-level payroll approvals. Approve or reject pending steps; all actions are audited."
      />

      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{period?.name ?? "Current period"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Pay date {period ? formatDate(period.payDate) : "—"}
            </p>
          </div>
          {period ? <StatusBadge status={period.status} /> : null}
        </CardHeader>
      </Card>

      <div className="relative space-y-0">
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No approval steps for this period. Submit a draft payroll from the
            period detail page.
          </p>
        ) : null}
        {steps.map((step, index) => {
          const Icon =
            step.status === "APPROVED"
              ? Check
              : step.status === "REJECTED"
                ? X
                : Circle;
          return (
            <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
              {index < steps.length - 1 ? (
                <div className="absolute left-[15px] top-8 h-[calc(100%-16px)] w-px bg-border" />
              ) : null}
              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  step.status === "APPROVED"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : step.status === "REJECTED"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-amber-500 bg-amber-50 text-amber-700"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <Card className="flex-1">
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        Level {step.level} · {step.approverName}
                      </p>
                      <Badge variant="secondary">
                        {step.role.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    {step.comment ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.comment}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.status === "PENDING"
                          ? "Awaiting action"
                          : "Action recorded"}
                      </p>
                    )}
                    {step.status === "PENDING" ? (
                      <ApprovalStepActions stepId={step.id} />
                    ) : null}
                  </div>
                  <div className="text-right">
                    <StatusBadge status={step.status} />
                    {step.actedAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(step.actedAt)}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
