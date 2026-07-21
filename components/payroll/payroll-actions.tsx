"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const INVOICE_ELIGIBLE = new Set([
  "WAITING",
  "APPROVED",
  "LOCKED",
  "DISBURSED",
  "PAYMENT_INSTRUCTION_GENERATED",
  "WAITING_CLIENT_TRANSFER",
  "TRANSFER_PROOF_UPLOADED",
  "UNDER_VERIFICATION",
  "VERIFIED",
  "CLOSED",
]);

export function PayrollPeriodActions({
  periodId,
  status,
  hasLatestCalc,
  hasProjectedCalc,
}: {
  periodId: string;
  status: string;
  hasLatestCalc?: boolean;
  hasProjectedCalc?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const run = async (path: string, key: string, body: object) => {
    setLoading(key);
    setError("");
    setInfo("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        error?: string;
        calculationId?: string;
        status?: string;
        runNumber?: number;
        invoice?: { id: string };
        id?: string;
        result?: { employeeCount?: number };
        verify?: { checks?: { code: string; ok: boolean; message: string }[] };
      };
      if (!res.ok) {
        const detail = json.verify?.checks
          ?.filter((c) => !c.ok)
          .map((c) => c.message)
          .join("; ");
        setError(detail || json.error || "Action failed");
      } else {
        if (key === "run") {
          setInfo(
            `Run #${json.runNumber ?? "?"} · ${json.calculationId?.slice(0, 8) ?? ""} · ${json.status}`,
          );
        } else if (key === "project") {
          setInfo(
            `Projected ${json.result?.employeeCount ?? ""} employees to PayrollLine`,
          );
        } else if (key === "lock") {
          setInfo("Period locked");
        } else if (key === "invoice" && json.invoice?.id) {
          setInfo("Invoice draft created — open Finance → Invoices");
        } else if (key === "pi" && json.id) {
          setInfo("Payment instruction generated");
        }
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setLoading(null);
  };

  const canMutate = ["DRAFT", "REJECTED", "WAITING"].includes(status);
  const canCalc = ["DRAFT", "REJECTED", "WAITING", "APPROVED"].includes(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canMutate ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!!loading}
          onClick={() =>
            run("/api/payroll/population", "pop", { periodId })
          }
        >
          {loading === "pop" ? "Building…" : "Build population"}
        </Button>
      ) : null}

      {canCalc ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!!loading}
          onClick={() =>
            run("/api/payroll/run", "run", {
              periodId,
              runReason: `Manual run ${new Date().toISOString()}`,
            })
          }
        >
          {loading === "run" ? "Calculating…" : "Run calculation"}
        </Button>
      ) : null}

      {["DRAFT", "REJECTED"].includes(status) ? (
        <Button
          size="sm"
          variant="accent"
          disabled={!!loading || !hasLatestCalc}
          title={!hasLatestCalc ? "Run calculation first" : undefined}
          onClick={() => run("/api/payroll/submit", "submit", { periodId })}
        >
          {loading === "submit" ? "Submitting…" : "Submit approval"}
        </Button>
      ) : null}

      {status === "APPROVED" && !hasProjectedCalc ? (
        <Button
          size="sm"
          variant="accent"
          disabled={!!loading || !hasLatestCalc}
          onClick={() =>
            run("/api/payroll/project", "project", { periodId })
          }
        >
          {loading === "project" ? "Projecting…" : "Project to lines"}
        </Button>
      ) : null}

      {status === "APPROVED" && hasProjectedCalc ? (
        <Button
          size="sm"
          variant="accent"
          disabled={!!loading}
          onClick={() =>
            run("/api/payroll/lock", "lock", { periodId, action: "lock" })
          }
        >
          {loading === "lock" ? "Locking…" : "Lock period"}
        </Button>
      ) : null}

      {status === "LOCKED" || (status === "APPROVED" && hasProjectedCalc) ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!!loading}
          onClick={async () => {
            setLoading("pi");
            setError("");
            try {
              const res = await fetch("/api/payout/instructions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  periodId,
                  idempotencyKey: `period-${periodId}-create`,
                }),
              });
              const json = (await res.json()) as {
                error?: string;
                instruction?: { id: string };
              };
              if (!res.ok) setError(json.error ?? "Create PI failed");
              else if (json.instruction?.id) {
                setInfo("DRAFT payment batch created — submit for approval");
                router.push(`/payment-instructions/${json.instruction.id}`);
              }
              router.refresh();
            } catch {
              setError("Network error");
            }
            setLoading(null);
          }}
        >
          {loading === "pi" ? "Creating…" : "Create payment batch (DRAFT)"}
        </Button>
      ) : null}

      {INVOICE_ELIGIBLE.has(status) ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!!loading}
          onClick={() =>
            run("/api/financial/invoices", "invoice", {
              action: "fromPayrollPeriod",
              payrollPeriodId: periodId,
            })
          }
        >
          {loading === "invoice" ? "Creating invoice…" : "Create invoice draft"}
        </Button>
      ) : null}

      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : null}
      {info ? (
        <span className="text-xs text-muted-foreground">{info}</span>
      ) : null}
    </div>
  );
}
