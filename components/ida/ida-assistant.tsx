"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  Download,
  FileSpreadsheet,
  MessageCircle,
  Settings2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Message = {
  id: number;
  role: "ida" | "user";
  text: string;
};

const starterActions = [
  { label: "Mulai payroll", prompt: "Saya ingin mulai proses payroll", icon: Sparkles },
  { label: "Minta template", prompt: "Saya membutuhkan template data payroll", icon: FileSpreadsheet },
  { label: "Import data", prompt: "Bantu saya mengimpor data", icon: Upload },
  { label: "Atur payroll", prompt: "Saya ingin mengatur atau menyesuaikan payroll", icon: Settings2 },
];

function answerFor(input: string): { text: string; href?: string; action?: string } {
  const value = input.toLowerCase();
  if (/mulai|proses payroll|payroll baru/.test(value)) {
    return {
      text: "Baik. Kita mulai dari periode payroll, lalu data masuk, validasi, kalkulasi, approval, pembayaran, dan penutupan. Saya arahkan ke Payroll Runs untuk membuat atau memilih periode aktif.",
      href: "/payroll",
      action: "Buka Payroll Runs",
    };
  }
  if (/template|format|excel/.test(value)) {
    return {
      text: "Template tersedia untuk employee, attendance, overtime, payroll component, mutation, BPJS, dan rekening bank. Buka Import Center untuk memilih dan mengunduh template yang sesuai.",
      href: "/import",
      action: "Buka Import Center",
    };
  }
  if (/import|upload|unggah/.test(value)) {
    return {
      text: "Saya akan membantu proses data masuk. Gunakan Import Center untuk upload file, preview data, validasi struktur, dan melihat baris yang perlu diperbaiki sebelum diproses.",
      href: "/import",
      action: "Import Data",
    };
  }
  if (/atur|setting|custom|komponen|bpjs|pajak|tanggal/.test(value)) {
    return {
      text: "Pengaturan payroll dapat disesuaikan melalui Payroll Setup dan Settings: tanggal cut-off, tanggal bayar, payroll group, komponen, pajak, BPJS, approval matrix, dan aturan project/client.",
      href: "/payroll-groups",
      action: "Buka Payroll Setup",
    };
  }
  if (/validasi|masalah|error|rekening|bpjs/.test(value)) {
    return {
      text: "Saya sarankan membuka Validation & Approval. Di sana Anda dapat melihat rekening kosong, absensi tidak valid, BPJS, NPWP, payroll group, dan exception lainnya.",
      href: "/validation",
      action: "Buka Validation",
    };
  }
  if (/approval|setuju|approve/.test(value)) {
    return {
      text: "Approval Queue menampilkan payroll yang menunggu review beserta feedback dan status tiap level persetujuan.",
      href: "/approval",
      action: "Buka Approval Queue",
    };
  }
  if (/bayar|payment|transfer|instruction/.test(value)) {
    return {
      text: "Setelah approval selesai, buat Payment Instruction, lakukan transfer, lalu verifikasi melalui Payment Confirmation.",
      href: "/payment-instructions",
      action: "Buka Payment Instruction",
    };
  }
  return {
    text: "Saya dapat membantu menjalankan payroll, meminta template, mengimpor dan memvalidasi data, menyesuaikan aturan payroll, mengarahkan approval, serta memproses pembayaran. Pilih salah satu aksi atau jelaskan tujuan Anda.",
  };
}

export function IdaAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "ida",
      text: "Halo, saya IDA. Saya akan memandu proses payroll dari setup data sampai payroll ditutup. Apa yang ingin Anda kerjakan?",
    },
  ]);
  const [lastAction, setLastAction] = useState<ReturnType<typeof answerFor> | null>(null);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-ida", handler);
    return () => window.removeEventListener("open-ida", handler);
  }, []);

  const nextId = useMemo(() => messages.length + 1, [messages.length]);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setMessages((current) => [
      ...current,
      { id: nextId, role: "user", text: trimmed },
    ]);
    setInput("");
    setOpen(true);
    setThinking(true);
    try {
      const response = await fetch("/api/ida/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, pathname }),
      });
      const result = (await response.json()) as {
        reply?: string;
        href?: string;
        action?: string;
      };
      if (!response.ok || !result.reply) throw new Error("IDA unavailable");
      setMessages((current) => [
        ...current,
        { id: nextId + 1, role: "ida", text: result.reply! },
      ]);
      setLastAction({
        text: result.reply,
        href: result.href,
        action: result.action,
      });
    } catch {
      const fallback = answerFor(trimmed);
      setMessages((current) => [
        ...current,
        { id: nextId + 1, role: "ida", text: fallback.text },
      ]);
      setLastAction(fallback);
    } finally {
      setThinking(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(input);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-navy px-4 py-3 text-white shadow-2xl transition hover:-translate-y-0.5 hover:bg-[#102c55] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
        aria-label="Buka IDA"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
          <Bot className="h-5 w-5" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-bold">IDA</span>
          <span className="block text-[11px] text-white/65">AI Payroll Assistant</span>
        </span>
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 transition",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-navy/20 backdrop-blur-[2px] transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          aria-label="Tutup IDA"
        />
        <section
          className={cn(
            "absolute bottom-4 right-4 flex h-[min(720px,calc(100vh-32px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-2xl transition duration-200",
            open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
          )}
          aria-label="IDA AI Payroll Assistant"
        >
          <header className="flex items-center justify-between bg-gradient-to-r from-[#071a32] to-[#124fbd] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-base font-bold">IDA</h2>
                <p className="text-xs text-white/65">Payroll guide & action assistant</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Tutup">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="border-b bg-slate-50 px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {starterActions.map(({ label, prompt, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => void submit(prompt)}
                  className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-left text-xs font-semibold text-navy shadow-sm hover:border-blue-300 hover:bg-blue-50"
                >
                  <Icon className="h-4 w-4 text-blue-600" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    message.role === "user"
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-bl-md border bg-slate-50 text-slate-700",
                  )}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {thinking ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  IDA sedang menganalisis…
                </div>
              </div>
            ) : null}
            {lastAction?.href ? (
              <Button asChild className="w-full rounded-xl bg-navy text-white hover:bg-navy/90">
                <Link href={lastAction.href}>{lastAction.action ?? "Buka Modul"}</Link>
              </Button>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="border-t bg-white p-3">
            <div className="flex items-end gap-2 rounded-2xl border bg-slate-50 p-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit(input);
                  }
                }}
                rows={2}
                placeholder="Tanyakan proses, template, atau pengaturan payroll..."
                className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none"
              />
              <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700" aria-label="Kirim">
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
              <span>IDA menggunakan konteks modul aktif</span>
              <span className="flex items-center gap-1"><Download className="h-3 w-3" /> Template tersedia</span>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
