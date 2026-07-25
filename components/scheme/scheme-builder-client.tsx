"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  activateSchemeDraft,
  approveSchemeDraft,
  createSchemeConversation,
  generateDraftFromConversation,
  getSchemeConversation,
  sendSchemeMessage,
  simulateSchemeDraft,
  submitSchemeForApproval,
} from "@/lib/scheme/actions";
import { Bot, Send, Sparkles } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

type ConvListItem = {
  id: string;
  title: string;
  status: string;
  updatedAt: Date | string;
  drafts: { id: string; status: string; schemeName: string; version: number }[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConvDetail = any;

export function SchemeBuilderClient({
  initialConversations,
}: {
  initialConversations: ConvListItem[];
}) {
  const [list, setList] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null,
  );
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [pending, start] = useTransition();

  function refreshDetail(id: string) {
    start(async () => {
      const d = await getSchemeConversation(id);
      setDetail(d);
      setActiveId(id);
    });
  }

  function onNew() {
    start(async () => {
      const id = await createSchemeConversation();
      setList((prev) => [
        {
          id,
          title: "Skema Payroll Baru",
          status: "DRAFT",
          updatedAt: new Date().toISOString(),
          drafts: [],
        },
        ...prev,
      ]);
      refreshDetail(id);
    });
  }

  function onSend() {
    if (!activeId || !message.trim()) return;
    const text = message.trim();
    setMessage("");
    start(async () => {
      const res = await sendSchemeMessage(activeId, text);
      if (!res.ok) setNotice(res.error);
      refreshDetail(activeId);
    });
  }

  const draft = detail?.drafts?.[0];

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {notice && (
        <div className="lg:col-span-12 rounded-xl border bg-white px-4 py-3 text-sm text-navy">
          {notice}
        </div>
      )}

      <Card className="p-4 lg:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-navy">Percakapan</h3>
          <Button size="sm" variant="outline" onClick={onNew} disabled={pending}>
            Baru
          </Button>
        </div>
        <div className="max-h-[70vh] space-y-2 overflow-y-auto">
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => refreshDetail(c.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                activeId === c.id ? "border-orange bg-orange/5" : "border-border"
              }`}
            >
              <div className="font-medium text-navy line-clamp-1">{c.title}</div>
              <div className="text-[11px] text-muted-foreground">{c.status}</div>
            </button>
          ))}
          {list.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Belum ada percakapan. Klik Baru untuk memulai.
            </p>
          )}
        </div>
      </Card>

      <Card className="flex min-h-[70vh] flex-col p-4 lg:col-span-5">
        <div className="mb-3 flex items-center gap-2 text-navy">
          <Bot className="h-5 w-5 text-orange" />
          <h3 className="font-display font-semibold">ProQ AI</h3>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto rounded-xl bg-[#F7F8FC] p-3">
          {!detail && (
            <p className="text-sm text-muted-foreground">
              Pilih atau buat percakapan untuk mulai menyusun skema.
            </p>
          )}
          {detail?.messages?.map(
            (m: { id: string; role: string; content: string }) => (
              <div
                key={m.id}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-navy text-white"
                    : "bg-white text-navy shadow-sm"
                }`}
              >
                {m.content}
              </div>
            ),
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Contoh: Buat skema SPG gaji 5jt, makan 25rb/hadir…"
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            disabled={!activeId || pending}
          />
          <Button onClick={onSend} disabled={!activeId || pending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!activeId || pending}
            onClick={() =>
              activeId &&
              start(async () => {
                const res = await generateDraftFromConversation(activeId);
                setNotice(res.ok ? "Draft digenerate." : res.error);
                refreshDetail(activeId);
              })
            }
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Draft
          </Button>
        </div>
      </Card>

      <Card className="p-4 lg:col-span-4">
        <h3 className="font-display font-semibold text-navy">Lifecycle skema</h3>
        {!draft && (
          <p className="mt-3 text-sm text-muted-foreground">
            Draft belum tersedia. Lanjutkan percakapan atau Generate Draft.
          </p>
        )}
        {draft && (
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="font-medium text-navy">{draft.schemeName}</div>
              <div className="text-xs text-muted-foreground">
                v{draft.version} · {draft.status}
              </div>
            </div>
            <pre className="max-h-48 overflow-auto rounded-xl bg-[#F7F8FC] p-3 text-[11px] text-navy/80">
              {JSON.stringify(draft.dslJson, null, 2)}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await simulateSchemeDraft(draft.id);
                    setNotice(
                      res.ok
                        ? `Simulasi selesai. ${res.allPass ? "Semua lulus." : "Ada kasus perlu review."}`
                        : res.error,
                    );
                    if (activeId) refreshDetail(activeId);
                  })
                }
              >
                Run Simulation
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await submitSchemeForApproval(draft.id);
                    setNotice(res.ok ? "Diajukan untuk approval." : res.error);
                    if (activeId) refreshDetail(activeId);
                  })
                }
              >
                Submit Approval
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await approveSchemeDraft(draft.id, "APPROVED");
                    setNotice(res.ok ? `Status: ${res.status}` : res.error);
                    if (activeId) refreshDetail(activeId);
                  })
                }
              >
                Approve
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Effective date</label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await activateSchemeDraft(draft.id, effectiveDate);
                    setNotice(
                      res.ok
                        ? "Skema diaktifkan."
                        : res.error,
                    );
                    if (activeId) refreshDetail(activeId);
                  })
                }
              >
                Activate
              </Button>
            </div>
            {draft.simulations?.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Hasil simulasi
                </div>
                {draft.simulations.map(
                  (s: {
                    id: string;
                    testCaseName: string;
                    passed: boolean | null;
                    resultJson: { netPay?: number; gross?: number };
                  }) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border px-2 py-1.5 text-xs"
                    >
                      <span>{s.testCaseName}</span>
                      <span>
                        {s.passed ? "Lulus" : "Perlu review"} · net{" "}
                        {formatRupiah(Number(s.resultJson?.netPay ?? 0))}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
