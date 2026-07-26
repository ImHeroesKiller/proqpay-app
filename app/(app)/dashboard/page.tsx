export const dynamic = "force-dynamic";

import { AttentionCenter } from "@/components/dashboard/attention-center";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { BusinessInsightPanel } from "@/components/dashboard/business-insight-panel";
import { ClientPayrollTable } from "@/components/dashboard/client-payroll-table";
import { InteractiveIndonesiaMap } from "@/components/dashboard/interactive-indonesia-map";
import { PaymentStatusCard } from "@/components/dashboard/payment-status-card";
import { ComponentCostCard } from "@/components/dashboard/component-cost-card";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/data/dashboard-snapshot";
import { requireModule } from "@/lib/auth/session";
import { auth } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";
import { buildHeuristicInsights } from "@/lib/ai/proq-intelligence";
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

export default async function DashboardPage() {
  const scope = await requireModule("dashboard");
  const session = await auth();
  const {
    dashboardKpis,
    dashboardAlerts,
    payrollPeriods,
    auditLogs,
    clientRows,
  } = await getDashboardSnapshot(scope.role, scope);

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
  const bruto = active?.totalGross ?? active?.totalNet ?? 0;
  const slaOnTrack = pendingApprovals === 0 && failedPayments === 0;
  const slaValue = slaOnTrack ? 92 : 78;

  const executiveKpis: KpiCardType[] = [
    {
      label: "Total Payroll (Bruto)",
      value: bruto
        ? formatCompactBruto(Number(bruto))
        : dashboardKpis.find((k) => /payroll|value/i.test(k.label))?.value ||
          formatRupiah(0),
      change: "12,5% dari periode lalu",
      trend: "up",
      href: "/payroll",
    },
    {
      label: "Total Karyawan",
      value: String(headcount || dashboardKpis[0]?.value || "0"),
      change: "Karyawan aktif",
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
      change: "8,1% dari bulan lalu",
      trend: "up",
      href: "/reports",
    },
  ];

  const initialIntelligence = buildHeuristicInsights({
    userName: session?.user?.name,
    kpis: executiveKpis,
    alerts: dashboardAlerts,
    periods: payrollPeriods,
  });

  return (
    <div className="mx-auto max-w-[1480px] space-y-4">
      <section
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]"
        aria-label="Dashboard utama"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {executiveKpis.map((item) => (
              <KpiCard key={item.label} item={item} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.25fr_.9fr]">
            <Card className="min-w-0 border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.055)] lg:h-[290px]">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-[12px] font-bold uppercase tracking-[0.06em] text-navy">
                  Payroll by Client / Project
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Ringkasan bruto dan status per client
                </p>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <ClientPayrollTable rows={clientRows} maxRows={3} />
              </CardContent>
            </Card>
            <div className="lg:h-[290px]">
              <PaymentStatusCard
                total={Number(bruto)}
                failed={failedPayments}
              />
            </div>
          </div>
        </div>
        <BusinessInsightPanel initial={initialIntelligence} />
      </section>
      <InteractiveIndonesiaMap headcount={headcount} />
      <section
        aria-label="Data operasional pendukung"
        className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.15fr_1.1fr_.9fr_1.05fr]"
      >
        <Card className="border-slate-100 shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-[12px] font-bold uppercase tracking-[0.06em] text-navy">
              Aktivitas Terbaru
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Ringkasan aktivitas operasional
            </p>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto p-5 pt-0">
            <ActivityTimeline items={auditLogs.slice(0, 5)} />
          </CardContent>
        </Card>
        <ComponentCostCard total={Number(bruto)} />
        <AttentionCenter alerts={dashboardAlerts} />
        <div className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.055)]">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.06em] text-navy">
            Aksi Cepat
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Akses pekerjaan payroll yang paling sering digunakan.
          </p>
          <div className="mt-3">
            <QuickActions />
          </div>
        </div>
      </section>
    </div>
  );
}
