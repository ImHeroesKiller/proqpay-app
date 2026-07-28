export const dynamic = "force-dynamic";

import { AttentionCenter } from "@/components/dashboard/attention-center";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ClientPayrollTable } from "@/components/dashboard/client-payroll-table";
import { InteractiveIndonesiaMap } from "@/components/dashboard/interactive-indonesia-map";
import { PaymentStatusCard } from "@/components/dashboard/payment-status-card";
import { ComponentCostCard } from "@/components/dashboard/component-cost-card";
import { DashboardPeriodFilter } from "@/components/dashboard/dashboard-period-filter";
import { IdaWorkspace } from "@/components/ida/ida-assistant";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/data/dashboard-snapshot";
import { requireModule } from "@/lib/auth/session";
import { formatRupiah } from "@/lib/utils";
import type { KpiCard as KpiCardType } from "@/types";

function formatCompactBruto(n: number): string {
  if (n >= 1_000_000_000_000)
    return `Rp ${(n / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  if (n >= 1_000_000_000)
    return `Rp ${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (n >= 1_000_000)
    return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return formatRupiah(n);
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveRange(
  preset: string,
  startValue?: string,
  endValue?: string,
): { start: Date; end: Date; preset: string; startValue: string; endValue: string } {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
  const customStart = parseDate(startValue);
  const customEnd = parseDate(endValue);

  if (preset === "custom" && customStart && customEnd) {
    customEnd.setUTCHours(23, 59, 59, 999);
    return {
      start: customStart,
      end: customEnd,
      preset,
      startValue: startValue ?? "",
      endValue: endValue ?? "",
    };
  }

  const start = new Date(end);
  if (preset === "week") start.setUTCDate(start.getUTCDate() - 6);
  else if (preset === "quarter") start.setUTCMonth(start.getUTCMonth() - 2, 1);
  else if (preset === "year") start.setUTCMonth(0, 1);
  else start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  return {
    start,
    end,
    preset: ["week", "month", "quarter", "year"].includes(preset) ? preset : "month",
    startValue: start.toISOString().slice(0, 10),
    endValue: end.toISOString().slice(0, 10),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rangeParam = Array.isArray(params.range) ? params.range[0] : params.range;
  const startParam = Array.isArray(params.start) ? params.start[0] : params.start;
  const endParam = Array.isArray(params.end) ? params.end[0] : params.end;
  const selectedRange = resolveRange(rangeParam ?? "month", startParam, endParam);

  const scope = await requireModule("dashboard");
  const {
    dashboardKpis,
    dashboardAlerts,
    payrollPeriods,
    auditLogs,
    clientRows,
    mapEmployees,
  } = await getDashboardSnapshot(scope.role, scope, {
    start: selectedRange.start,
    end: selectedRange.end,
  });

  const active =
    payrollPeriods.find((p) =>
      [
        "WAITING",
        "APPROVED",
        "PAYMENT_INSTRUCTION_GENERATED",
        "WAITING_CLIENT_TRANSFER",
        "TRANSFER_PROOF_UPLOADED",
        "UNDER_VERIFICATION",
      ].includes(p.status),
    ) ?? payrollPeriods[0];

  const pendingApprovals = Number(
    dashboardKpis
      .find((k) => /approval|menunggu/i.test(k.label))
      ?.value.replace(/\D/g, "") ||
      dashboardAlerts
        .find((a) => a.id === "al_approval")
        ?.description.match(/(\d+)/)?.[1] ||
      0,
  );
  const failedPayments = Number(
    dashboardAlerts
      .find((a) => a.id === "al_fail")
      ?.description.match(/(\d+)/)?.[1] || 0,
  );
  const headcount =
    active?.employeeCount ||
    Number(
      dashboardKpis
        .find((k) => /headcount|karyawan/i.test(k.label))
        ?.value.replace(/\D/g, "") || 0,
    );
  const bruto = payrollPeriods.reduce(
    (sum, period) => sum + Number(period.totalGross || period.totalNet || 0),
    0,
  );
  const slaOnTrack = pendingApprovals === 0 && failedPayments === 0;
  const slaValue = slaOnTrack ? 92 : 78;

  const executiveKpis: KpiCardType[] = [
    {
      label: "Total Payroll (Bruto)",
      value: bruto ? formatCompactBruto(Number(bruto)) : formatRupiah(0),
      change: `${selectedRange.startValue} s.d. ${selectedRange.endValue}`,
      trend: "up",
      href: "/payroll",
    },
    {
      label: "Total Karyawan",
      value: String(headcount || dashboardKpis[0]?.value || "0"),
      change: "Karyawan aktif pada periode",
      trend: "up",
      href: "/employees",
    },
    {
      label: "SLA Payroll",
      value: `${slaValue}%`,
      change: slaOnTrack ? "On Track" : "Perlu perhatian",
      trend: slaOnTrack ? "up" : "down",
      href: "/reports",
    },
    {
      label: "Penghematan Biaya",
      value: bruto ? formatCompactBruto(Number(bruto) * 0.081) : "Rp 0",
      change: "Estimasi 8,1% pada periode",
      trend: "up",
      href: "/reports",
    },
  ];

  return (
    <div className="mx-auto max-w-[1480px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">ProQPay Lite</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Dashboard & IDA Workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Instruksikan pekerjaan melalui IDA. Dashboard akan menyesuaikan setelah aksi dikonfirmasi.</p>
        </div>
        <DashboardPeriodFilter
          preset={selectedRange.preset}
          start={selectedRange.startValue}
          end={selectedRange.endValue}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]" aria-label="Dashboard utama dan IDA Workspace">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {executiveKpis.map((item) => (
              <KpiCard key={item.label} item={item} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.25fr_.9fr]">
            <Card className="flex min-w-0 flex-col overflow-hidden border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.055)] lg:h-[310px]">
              <CardHeader className="shrink-0 p-5 pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-[0.05em] text-navy">Payroll by Client / Project</CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">Ringkasan bruto dan status per client pada periode terpilih</p>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 overflow-auto p-5 pt-0">
                <ClientPayrollTable rows={clientRows} />
              </CardContent>
            </Card>
            <div className="lg:h-[310px]">
              <PaymentStatusCard total={Number(bruto)} failed={failedPayments} />
            </div>
          </div>
        </div>
        <IdaWorkspace className="min-h-[710px] xl:row-span-2" />
      </section>

      <section aria-label="Sebaran dan aktivitas operasional" className="grid gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <InteractiveIndonesiaMap headcount={headcount} employees={mapEmployees} />
        </div>
        <Card className="flex min-h-[430px] min-w-0 flex-col border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
          <CardHeader className="shrink-0 p-5 pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.05em] text-navy">Aktivitas Terbaru</CardTitle>
            <p className="text-xs leading-5 text-muted-foreground">Ringkasan aktivitas operasional pada periode terpilih</p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-5 pt-0">
            <ActivityTimeline items={auditLogs.slice(0, 8)} />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Data operasional pendukung" className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ComponentCostCard total={Number(bruto)} />
        <AttentionCenter alerts={dashboardAlerts} />
        <div className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
          <h2 className="text-sm font-bold uppercase tracking-[0.05em] text-navy">Admin Fallback</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Akses modul operasional lama hanya saat IDA memerlukan penanganan manual oleh admin.</p>
          <div className="mt-4"><QuickActions /></div>
        </div>
      </section>
    </div>
  );
}
