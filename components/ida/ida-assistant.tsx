"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  IdaActionProposal,
  IdaChatResponse,
  IdaConversationState,
  IdaExecuteResponse,
} from "@/lib/ida/contracts";

type Message = { id: string; role: "ida" | "user"; text: string };
type WorkspaceProps = { embedded?: boolean; className?: string };

const STORAGE_KEY = "proqpay-lite-ida-workspace-v1";
const starters = [
  "Mulai proses payroll bulan ini",
  "Cek data yang perlu divalidasi",
  "Hitung payroll periode aktif",
  "Tampilkan status approval dan pembayaran",
];

function initialState(): IdaConversationState {
  return {
    conversationId: crypto.randomUUID(),
    workflowStage: "SETUP",
    updatedAt: new Date().toISOString(),
  };
}

function Workspace({ embedded = false, className }: WorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [state, setState] = useState<IdaConversationState>(initialState);
  const [proposal, setProposal] = useState<IdaActionProposal>();
  const [confirmationToken, setConfirmationToken] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ida",
      text: "Halo, saya IDA. Semua proses ProQPay Lite dapat dijalankan dari workspace ini. Ceritakan pekerjaan payroll yang ingin Anda selesaikan.",
    },
  ]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { state?: IdaConversationState; messages?: Message[] };
      if (parsed.state) setState(parsed.state);
      if (parsed.messages?.length) setMessages(parsed.messages.slice(-40));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, messages: messages.slice(-40) }));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, state]);

  async function submit(text: string) {
    const value = text.trim();
    if (!value || thinking || executing) return;
    setInput("");
    setProposal(undefined);
    setConfirmationToken(undefined);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: value }]);
    setThinking(true);
    try {
      const response = await fetch("/api/ida/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, pathname, state }),
      });
      const result = (await response.json()) as IdaChatResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "IDA tidak tersedia");
      setState(result.state);
      setProposal(result.proposal);
      setConfirmationToken(result.confirmationToken);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "ida", text: result.reply },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "ida",
          text: error instanceof Error ? error.message : "IDA belum dapat memproses permintaan ini.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function confirmAction() {
    if (!confirmationToken || executing) return;
    setExecuting(true);
    try {
      const response = await fetch("/api/ida/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken }),
      });
      const result = (await response.json()) as IdaExecuteResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "Aksi gagal dijalankan");
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "ida", text: result.message },
      ]);
      setProposal(undefined);
      setConfirmationToken(undefined);
      setState((current) => ({ ...current, pendingAction: undefined, updatedAt: new Date().toISOString() }));
      if (result.refreshDashboard) router.refresh();
      if (result.adminHref) router.push(result.adminHref);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "ida",
          text: error instanceof Error ? error.message : "Aksi gagal dijalankan.",
        },
      ]);
    } finally {
      setExecuting(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(input);
  }

  return (
    <section
      className={cn(
        "flex min-h-[620px] flex-col overflow-hidden rounded-[24px] border border-indigo-100 bg-white shadow-[0_18px_55px_rgba(79,70,229,0.12)]",
        className,
      )}
      aria-label="Unified IDA Workspace"
    >
      <header className="relative overflow-hidden border-b border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-violet-200/40 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-lg shadow-indigo-200">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900">IDA Workspace</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Ready</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">AI Payroll Operator · seluruh instruksi, preview, konfirmasi, dan eksekusi dalam satu ruang.</p>
          </div>
        </div>
        <div className="relative mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-semibold text-slate-500">
          {["SETUP", "IMPORT", "VALIDATION", "CALCULATION", "APPROVAL", "PAYMENT_INSTRUCTION", "REPORTING"].map((stage) => (
            <span key={stage} className={cn("whitespace-nowrap rounded-full border px-2.5 py-1", state.workflowStage === stage ? "border-indigo-300 bg-indigo-100 text-indigo-700" : "border-slate-200 bg-white")}>
              {stage.replaceAll("_", " ")}
            </span>
          ))}
        </div>
      </header>

      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          {starters.map((prompt) => (
            <button key={prompt} type="button" onClick={() => void submit(prompt)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-semibold leading-4 text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700">
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6", message.role === "user" ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md border border-slate-200 bg-slate-50 text-slate-700")}>
              {message.text}
            </div>
          </div>
        ))}
        {thinking ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> IDA sedang menganalisis konteks dan permission…</div>
        ) : null}

        {proposal ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{proposal.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{proposal.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {confirmationToken ? (
                    <button type="button" onClick={() => void confirmAction()} disabled={executing} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                      {executing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Konfirmasi dan Jalankan
                    </button>
                  ) : null}
                  <button type="button" onClick={() => { setProposal(undefined); setConfirmationToken(undefined); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600">Batalkan</button>
                  {proposal.adminHref ? (
                    <Link href={proposal.adminHref} className="inline-flex items-center gap-1 px-2 py-2 text-xs font-semibold text-indigo-700">Admin fallback <ChevronRight className="h-3 w-3" /></Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-slate-100 bg-white p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(input); } }} rows={2} placeholder="Contoh: Hitung payroll periode 550e8400-e29b-41d4-a716-446655440000" className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none" />
          <button type="submit" disabled={thinking || executing} className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50" aria-label="Kirim"><MessageCircle className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-slate-400">
          <span>Conversation state tersimpan di workspace ini</span>
          <button type="button" onClick={() => router.refresh()} className="flex items-center gap-1 font-semibold text-indigo-600"><RefreshCw className="h-3 w-3" /> Refresh dashboard</button>
        </div>
      </form>
    </section>
  );
}

export function IdaWorkspace(props: WorkspaceProps) {
  return <Workspace {...props} embedded />;
}

export function IdaAssistant() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-ida", handler);
    return () => window.removeEventListener("open-ida", handler);
  }, []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-indigo-600 px-4 py-3 text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-indigo-700" aria-label="Buka IDA">
        <Sparkles className="h-5 w-5" /><span className="hidden text-sm font-bold sm:block">Buka IDA</span>
      </button>
      <div className={cn("fixed inset-0 z-50 transition", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <button type="button" onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-slate-950/20 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} aria-label="Tutup IDA" />
        <div className={cn("absolute bottom-4 right-4 h-[min(820px,calc(100vh-32px))] w-[min(470px,calc(100vw-32px))] transition duration-200", open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}>
          <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-slate-500 shadow" aria-label="Tutup"><X className="h-4 w-4" /></button>
          <Workspace className="h-full min-h-0" />
        </div>
      </div>
    </>
  );
}
