"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PayrollPeriodActions({
  periodId,
  status,
}: {
  periodId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const run = async (path: string, key: string, body: object) => {
    setLoading(key);
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Action failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setLoading(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {["DRAFT", "REJECTED", "WAITING", "APPROVED"].includes(status) ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!!loading}
          onClick={() =>
            run("/api/payroll/recalculate", "recalc", { periodId })
          }
        >
          {loading === "recalc" ? "Recalculating…" : "Recalculate"}
        </Button>
      ) : null}
      {["DRAFT", "REJECTED"].includes(status) ? (
        <Button
          size="sm"
          variant="accent"
          disabled={!!loading}
          onClick={() => run("/api/payroll/submit", "submit", { periodId })}
        >
          {loading === "submit" ? "Submitting…" : "Submit approval"}
        </Button>
      ) : null}
      {status === "APPROVED" ? (
        <Button
          size="sm"
          variant="accent"
          disabled={!!loading}
          onClick={() =>
            run("/api/payroll/generate-instruction", "pi", { periodId })
          }
        >
          {loading === "pi" ? "Generating…" : "Generate payment instruction"}
        </Button>
      ) : null}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : null}
    </div>
  );
}
