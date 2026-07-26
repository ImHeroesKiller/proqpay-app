export const dynamic = "force-dynamic";

import { AttentionCenter } from "@/components/dashboard/attention-center";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ChartsLazy } from "@/components/dashboard/charts-lazy";
import { PayrollPipeline } from "@/components/dashboard/payroll-pipeline";
import { BusinessInsightPanel } from "@/components/dashboard/business-insight-panel";
import { ClientPayrollTable } from "@/components/dashboard/client-payroll-table";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/data/dashboard-snapshot";
import { requireModule } from "@/lib/auth/session";
import { auth } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";
import { buildHeuristicInsights } from "@/lib/ai/proq-intelligence";
import type { KpiCard as KpiCardType } from "@/types";

function formatCompactBruto(n: number): string {
  if (n >= 1_000_000_000_000) return `Rp ${(n / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return formatRupiah(n);
}

export default async function DashboardPage() {
  const scope = await requireModule("dashboard");
  const session = await auth();
  const { dashboardKpis, dashboardAlerts, payrollPeriods, chartData, auditLogs, clientRows } =
    await getDashboardSnapshot(scope.role, scope);

  const active =
    payrollPeriods.find((p) =>
      ["WAITING", "APPROVED", "PAYMENT_INSTRUCTION_GENERATED", "WAITING_CLIENT_TRANSFER", "TRANSFER_PROOF_UPLOADED", "UNDER_VERIFICATION"].includes(p.status),
    ) ?? payrollPeriods[0];

  const pendingApprovals = Number(
    dashboardKpis.find((k) => /approval|menunggu/i.test(k.label))?.value.replace(/\D/g, "") ||
      dashboardAlerts.find((a) => a.id === "al_approval")?.description.match(/(\d+)/)?.[1] ||
      0,
  );
  const failedPayments = Number(dashboardAlerts.find((a) => a.id === "al_fail")?.description.match(/(\d+)/)?.[1] || 0);
  const headcount = active?.employeeCount || Number(dashboardKpis.find((k) => /headcount|karyawan/i.test(k.label))?.value.replace(/\D/g, "") || 0);
  const bruto = active?.totalGross ?? active?.totalNet ?? 0;
  const dataIssues = Number(dashboardKpis.find((k) => /exception|bermasalah/i.test(k.label))?.value.replace(/\D/g, "") || 0);
  const slaOnTrack = pendingApprovals === 0 && failedPayments === 0;
  const slaValue = slaOnTrack ? 92 : 78;

  const executiveKpis: KpiCardType[] = [
    { label: "Total Karyawan", value: String(headcount || dashboardKpis[0]?.value || "0"), change: dashboardKpis[0]?.change ?? "Aktif", trend: "neutral", href: "/employees" },
    { label: "Total Payroll (Bruto)", value: bruto ? formatCompactBruto(Number(bruto)) : dashboardKpis.find((k) => /payroll|value/i.test(k.label))?.value || formatRupiah(0), change: active?.name ?? "Periode berjalan", trend: "up", href: "/payroll" },
    { label: "Menunggu Approval", value: String(pendingApprovals), change: pendingApprovals ? "Perlu tindakan" : "Antrian kosong", trend: pendingApprovals ? "down" : "up", href: "/approval" },
    { label: "Data Bermasalah", value: String(dataIssues), change: dataIssues ? "Perlu validasi" : "Data bersih", trend: dataIssues ? "down" : "up", href: "/employees" },
    { label: "Pembayaran Gagal", value: String(failedPayments), change: failedPayments ? "Tinjau segera" : "Tidak ada kegagalan", trend: failedPayments ? "down" : "up", href: "/payment-confirmation" },
    { label: "SLA Payroll", value: `${slaValue}%`, change: slaOnTrack ? "On Track" : "Perlu perhatian", trend: slaOnTrack ? "up" : "down", href: "/reports" },
  ];

  const initialIntelligence = buildHeuristicInsights({
    userName: session?.user?.name,
    kpis: executiveKpis,
    alerts: dashboardAlerts,
    periods: payrollPeriods,
  });

  const firstName = session?.user?.name?.split(" ")[0] ?? "Siti";

  return (
    <div className="space-y-5">
      <section className="flex items-end justify-between gap-4" aria-label="Dashboard title"><div><h2 className="font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">My Workspace</h2><p className="mt-1 text-sm text-muted-foreground">Ringkasan payroll, risiko, dan tindakan penting untuk {firstName}.</p></div></section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" aria-label="Payroll overview">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{executiveKpis.slice(0, 4).map((item) => <KpiCard key={item.label} item={item} />)}</div>
        <div className="xl:row-span-2"><BusinessInsightPanel initial={initialIntelligence} /></div>
        <Card className="border-border/80 bg-white shadow-soft xl:col-span-1">
          <CardHeader><CardTitle className="font-display text-base font-bold uppercase tracking-[0.08em] text-navy">Payroll by Client / Project</CardTitle><p className="text-sm text-muted-foreground">Ringkasan bruto dan status per client</p></CardHeader>
          <CardContent><ClientPayrollTable rows={clientRows} /></CardContent>
        </Card>
      </section>

      <section aria-label="Operational insight" className="grid gap-5 lg:grid-cols-3">
        <Card className="border-border/80 bg-white shadow-soft lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-display text-base font-bold uppercase tracking-[0.08em] text-navy">Payroll Trend</CardTitle>
            <p className="text-sm text-muted-foreground">Nilai payroll 6 bulan terakhir</p>
          </CardHeader>
          <CardContent className="h-72"><ChartsLazy data={chartData.map((d) => ({ ...d, amount: d.amount / 1000 }))} /></CardContent>
        </Card>
        <div className="lg:col-span-1"><AttentionCenter alerts={dashboardAlerts} /></div>
        <div className="lg:col-span-1"><QuickActions /></div>
      </section>

      <section aria-label="Aktivitas terbaru" className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/80 bg-white shadow-soft">
          <CardHeader>
            <CardTitle className="font-display text-base font-bold uppercase tracking-[0.08em] text-navy">Aktivitas Terbaru</CardTitle>
            <p className="text-sm text-muted-foreground">Ringkasan aktivitas operasional</p>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-y-auto"><ActivityTimeline items={auditLogs.slice(0, 8)} /></CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-4">{executiveKpis.slice(4).map((item) => <KpiCard key={item.label} item={item} />)}</div>
      </section>
    </div>
  );
}
