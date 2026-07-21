"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CreatePayoutButton({ periodId }: { periodId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setLoading(true);
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
      const data = (await res.json()) as {
        error?: string;
        instruction?: { id: string };
      };
      if (!res.ok) {
        setError(data.error ?? "Create failed");
      } else if (data.instruction?.id) {
        router.push(`/payment-instructions/${data.instruction.id}`);
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="accent" disabled={loading} onClick={() => void create()}>
        {loading ? "Creating…" : "Create payment batch"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
