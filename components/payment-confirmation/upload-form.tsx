"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type InstructionOption = {
  id: string;
  label: string;
  amount: number;
};

export function UploadProofForm({
  instructions,
}: {
  instructions: InstructionOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [instructionId, setInstructionId] = useState(
    instructions[0]?.id ?? "",
  );
  const selected = instructions.find((i) => i.id === instructionId);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("paymentInstructionId", instructionId);
    if (!data.get("paymentAmount") && selected) {
      data.set("paymentAmount", String(selected.amount));
    }

    try {
      const res = await fetch("/api/payment-confirmation/upload", {
        method: "POST",
        body: data,
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
        setLoading(false);
        return;
      }
      router.push(`/payment-confirmation/${json.id}`);
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instruction">Payment instruction</Label>
            <select
              id="instruction"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={instructionId}
              onChange={(e) => setInstructionId(e.target.value)}
              required
            >
              {instructions.length === 0 ? (
                <option value="">No instructions awaiting proof</option>
              ) : null}
              {instructions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment date</Label>
              <Input id="paymentDate" name="paymentDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Amount (IDR)</Label>
              <Input
                id="paymentAmount"
                name="paymentAmount"
                type="number"
                step="0.01"
                defaultValue={selected?.amount}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payerBank">Payer bank</Label>
              <Input id="payerBank" name="payerBank" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payerAccountName">Payer account name</Label>
              <Input id="payerAccountName" name="payerAccountName" required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payerAccount">Payer account number</Label>
              <Input
                id="payerAccount"
                name="payerAccount"
                required
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Stored masked in the database.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Bank reference</Label>
              <Input id="referenceNumber" name="referenceNumber" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" name="notes" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Proof file (PDF / PNG / JPG, max 10 MB)</Label>
            <Input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              required
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <Button type="submit" disabled={loading || !instructionId}>
            {loading ? "Uploading…" : "Submit proof"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
