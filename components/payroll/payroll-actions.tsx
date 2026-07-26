"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PayrollPeriodActions({
  periodId,
  status,
  companyId,
}: {
  periodId: string;
  status: string;
  companyId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [bankCode, setBankCode] = useState<"BCA" | "MANDIRI" | "BRI" | "CUSTOM">("BCA");
  const [needsTemplate, setNeedsTemplate] = useState(false);

  const run = async (path: string, key: string, body: object) => {
    setLoading(key);
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        error?: string;
        templateRequired?: boolean;
      };
      if (!res.ok) {
        setError(json.error ?? "Action failed");
        setNeedsTemplate(Boolean(json.templateRequired));
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setLoading(null);
  };

  const uploadTemplate = async (file: File | null) => {
    if (!file) return;
    setLoading("template");
    setError("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const response = await fetch("/api/payment-instructions/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          bankCode,
          fileName: file.name,
          base64: btoa(binary),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Template gagal disimpan");
      setNeedsTemplate(false);
      await run("/api/payroll/generate-instruction", "pi", {
        periodId,
        bankCode,
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Template gagal disimpan",
      );
    } finally {
      setLoading(null);
    }
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
        <>
          <select
            value={bankCode}
            onChange={(event) => {
              setBankCode(
                event.target.value as "BCA" | "MANDIRI" | "BRI" | "CUSTOM",
              );
              setNeedsTemplate(false);
              setError("");
            }}
            className="h-9 rounded-xl border bg-white px-3 text-sm"
          >
            <option value="BCA">BCA</option>
            <option value="MANDIRI">Mandiri</option>
            <option value="BRI">BRI</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <Button
            size="sm"
            variant="accent"
            disabled={!!loading}
            onClick={() =>
              run("/api/payroll/generate-instruction", "pi", {
                periodId,
                bankCode,
              })
            }
          >
            {loading === "pi" ? "Generating…" : "Generate payment instruction"}
          </Button>
          {needsTemplate ? (
            <label className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800">
              IDA: unggah template resmi {bankCode}
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                className="hidden"
                onChange={(event) =>
                  void uploadTemplate(event.target.files?.[0] ?? null)
                }
              />
            </label>
          ) : null}
        </>
      ) : null}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : null}
    </div>
  );
}
