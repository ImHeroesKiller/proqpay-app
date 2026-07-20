"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ApprovalStepActions({ stepId }: { stepId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const act = async (decision: "APPROVED" | "REJECTED") => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payroll/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, decision, comment }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) setError(json.error ?? "Failed");
      else router.refresh();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  return (
    <div className="mt-2 space-y-2">
      <Input
        placeholder="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" disabled={loading} onClick={() => act("APPROVED")}>
          Approve
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
