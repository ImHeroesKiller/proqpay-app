"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyActions({ confirmationId }: { confirmationId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const act = async (decision: "VERIFIED" | "REJECTED" | "NEED_REVISION") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payment-confirmation/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationId, decision, reason }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm font-semibold">Verification</p>
      <div className="space-y-2">
        <Label htmlFor="reason">Reason (for reject / revision)</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional unless rejecting"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="accent"
          disabled={loading}
          onClick={() => act("VERIFIED")}
        >
          Verify & progress payroll
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => act("NEED_REVISION")}
        >
          Need revision
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => act("REJECTED")}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
