"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Database,
  FileSpreadsheet,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { label: "Siapkan periode", href: "/payroll", icon: PlayCircle },
  { label: "Masukkan data", href: "/import", icon: Database },
  { label: "Validasi", href: "/validation", icon: ShieldCheck },
  { label: "Hitung & approval", href: "/approval", icon: CheckCircle2 },
  { label: "Bayar & tutup", href: "/payment-instructions", icon: Circle },
];

export function PayrollStartGuide({
  currentStage = 0,
  periodName,
}: {
  currentStage?: number;
  periodName?: string;
}) {
  const activeIndex = Math.max(0, Math.min(currentStage, steps.length - 1));
  const active = steps[activeIndex];

  return (
    <section className="overflow-hidden rounded-[22px] border border-blue-100 bg-gradient-to-r from-white via-blue-50/70 to-indigo-50 shadow-soft">
      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-600">Panduan proses</p>
              <h2 className="font-display text-lg font-bold text-navy">Lanjutkan payroll {periodName ?? "aktif"}</h2>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            Ikuti proses dari kiri ke kanan. IDA akan menjelaskan langkah berikutnya, menyiapkan template, membantu import data, dan mengarahkan Anda ke modul yang tepat.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-5">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const done = index < activeIndex;
              const current = index === activeIndex;
              return (
                <Link
                  key={step.label}
                  href={step.href}
                  className={`group rounded-xl border px-3 py-3 transition ${
                    current
                      ? "border-blue-300 bg-white shadow-md"
                      : done
                        ? "border-emerald-100 bg-emerald-50/60"
                        : "border-transparent bg-white/55 hover:border-blue-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        current
                          ? "bg-blue-600 text-white"
                          : done
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">0{index + 1}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-navy">{step.label}</p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-[210px] flex-col gap-2 rounded-2xl border border-white bg-white/85 p-4 shadow-sm backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Langkah berikutnya</p>
          <p className="font-display text-base font-bold text-navy">{active.label}</p>
          <Button asChild className="mt-1 justify-between rounded-xl bg-blue-600 text-white hover:bg-blue-700">
            <Link href={active.href}>
              Buka langkah
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-ida"))}
            className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold text-navy hover:border-blue-300 hover:bg-blue-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Tanya IDA
          </button>
        </div>
      </div>
    </section>
  );
}
