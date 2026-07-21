"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PayoutBatchActions({
  instructionId,
  nextActions,
}: {
  instructionId: string;
  nextActions: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");

  async function act(path: string, key: string, body?: object) {
    setLoading(key);
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Action failed");
      else router.refresh();
    } catch {
      setError("Network error");
    }
    setLoading(null);
  }

  const base = `/api/payout/instructions/${instructionId}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {nextActions.includes("SUBMIT") ? (
          <Button
            size="sm"
            variant="accent"
            disabled={!!loading}
            onClick={() => void act(`${base}/submit`, "submit")}
          >
            {loading === "submit" ? "Submitting…" : "Submit for approval"}
          </Button>
        ) : null}
        {nextActions.includes("APPROVE") ? (
          <Button
            size="sm"
            variant="accent"
            disabled={!!loading}
            onClick={() =>
              void act(`${base}/approve`, "approve", { comment: comment || undefined })
            }
          >
            {loading === "approve" ? "Approving…" : "Approve"}
          </Button>
        ) : null}
        {nextActions.includes("REJECT") ? (
          <Button
            size="sm"
            variant="outline"
            disabled={!!loading || !reason.trim()}
            onClick={() => void act(`${base}/reject`, "reject", { reason })}
          >
            {loading === "reject" ? "Rejecting…" : "Reject"}
          </Button>
        ) : null}
        {nextActions.includes("RESUBMIT") ? (
          <Button
            size="sm"
            variant="accent"
            disabled={!!loading}
            onClick={() => void act(`${base}/resubmit`, "resubmit")}
          >
            {loading === "resubmit" ? "Resubmitting…" : "Resubmit"}
          </Button>
        ) : null}
        {nextActions.includes("CANCEL") ? (
          <Button
            size="sm"
            variant="outline"
            disabled={!!loading}
            onClick={() =>
              void act(`${base}/cancel`, "cancel", {
                reason: reason || "Cancelled by user",
              })
            }
          >
            {loading === "cancel" ? "Cancelling…" : "Cancel batch"}
          </Button>
        ) : null}
        {nextActions.includes("READY_FOR_BANK_FILE") ? (
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            READY for bank file (I2-B)
          </span>
        ) : null}
      </div>
      {(nextActions.includes("APPROVE") ||
        nextActions.includes("REJECT") ||
        nextActions.includes("CANCEL")) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {nextActions.includes("APPROVE") ? (
            <Input
              placeholder="Approval comment (required for SUPER_ADMIN self-approve)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          ) : null}
          {nextActions.includes("REJECT") || nextActions.includes("CANCEL") ? (
            <Input
              placeholder="Rejection / cancel reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          ) : null}
        </div>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
