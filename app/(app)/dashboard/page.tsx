export const dynamic = "force-dynamic";

import { CommandHero } from "@/components/dashboard/command-hero";
import { AttentionCenter } from "@/components/dashboard/attention-center";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ChartsLazy } from "@/components/dashboard/charts-lazy";
import { PayrollPipeline } from "@/components/dashboard/payroll-pipeline";
import { BusinessInsightPanel } from "@/components/dashboard/business-insight-panel";
import { ClientPayrollTable } from "@/components/dashboard/client-payroll-table";
import { buildPipeline } from "@/lib/domain/payroll-pipeline";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/data/dashboard-snapshot";
import { requireModule } from "@/lib/auth/session";
import { auth } from "@/lib/auth";
import { formatRupiah } from "@/lib/utils";
import { buildHeuristicInsights } from "@/lib/ai/proq-intelligence";
import type { KpiCard as KpiCardType } from "@/types";

function formatCompactBruto(n: number): string {
  if (n >= 1_000_000_000_000) {
    return `Rp ${(n / 1_000_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T`;
  }
  if (n >= 1_000_000_000) {
    return `Rp ${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  }
  if (n >= 1_000_000) {
    return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  return formatRupiah(n);
}

function formatIdDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function DashboardPage() {
  const scope = await requireModule("dashboard");
  const session = await auth();
  const {
    dashboardKpis,
    dashboardAlerts,
    payrollPeriods,
    chartData,
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
    dashboardKpis.find((k) =>
      /approval|menunggu/i.test(k.label),
    )?.value.replace(/\D/g, "") ||
      dashboardAlerts.find((a) => a.id === "al_approval")
        ?.description.match(/(\d+)/)?.[1] ||
      0,
  );

  const failedPayments = Number(
    dashboardAlerts.find((a) => a.id === "al_fail")?.description.match(
      /(\d+)/,
    )?.[1] || 0,
  );

  const headcount =
    active?.employeeCount ||
    Number(
      dashboardKpis.find((k) => /headcount|karyawan/i.test(k.label))?.value.replace(
        /\D/g,
        "",
      ) || 0,
    );

  const bruto = active?.totalGross ?? active?.totalNet ?? 0;

  const dataIssues = Number(
    dashboardKpis
      .find((k) => /exception|bermasalah/i.test(k.label))
      ?.value.replace(/\D/g, "") || 0,
  );

  const slaOnTrack = pendingApprovals === 0 && failedPayments === 0;
  const slaValue = slaOnTrack ? 92 : 78;

  const executiveKpis: KpiCardType[] = [
    {
      label: "Total Karyawan",
      value: String(headcount || dashboardKpis[0]?.value || "0"),
      change: dashboardKpis[0]?.change ?? "Aktif",
      trend: "neutral",
      href: "/employees",
    },
    {
      label: "Total Payroll (Bruto)",
      value: bruto
        ? formatCompactBruto(Number(bruto))
        : dashboardKpis.find((k) => /payroll|value/i.test(k.label))?.value ||
          formatRupiah(0),
      change: active?.name ?? "Periode berjalan",
      trend: "up",
      href: "/payroll",
    },
    {
      label: "Menunggu Approval",
      value: String(pendingApprovals),
      change: pendingApprovals ? "Perlu tindakan" : "Antrian kosong",
      trend: pendingApprovals ? "down" : "up",
      href: "/approval",
    },
    {
      label: "Data Bermasalah",
      value: String(dataIssues),
      change: dataIssues ? "Perlu validasi" : "Data bersih",
      trend: dataIssues ? "down" : "up",
      href: "/employees",
    },
    {
      label: "Pembayaran Gagal",
      value: String(failedPayments),
      change: failedPayments ? "Tinjau segera" : "Tidak ada kegagalan",
      trend: failedPayments ? "down" : "up",
      href: "/payment-confirmation",
    },
    {
      label: "SLA Payroll",
      value: `${slaValue}%`,
      change: slaOnTrack ? "On Track" : "Perlu perhatian",
      trend: slaOnTrack ? "up" : "down",
      href: "/reports",
    },
  ];

  const pipeline = buildPipeline(active?.status, {
    pendingApprovals: pendingApprovals > 0 ? pendingApprovals : 0,
    failedPayments: failedPayments > 0 ? failedPayments : 0,
    employeeCount: headcount || undefined,
  });

  const initialIntelligence = buildHeuristicInsights({
    userName: session?.user?.name,
    kpis: executiveKpis,
    alerts: dashboardAlerts,
    periods: payrollPeriods,
  });

  const periodLabel = active?.name ?? "Juli 2026";

  return (
    <div className="space-y-5">
      <CommandHero
        periodName={periodLabel}
        userName={session?.user?.name}
        cutOffDate={formatIdDate(active?.periodEnd)}
        payrollDate={formatIdDate(active?.payDate)}
        slaLabel={`${slaValue}% On Track`}
        insightCount={Math.min(3, initialIntelligence.insights.length || 3)}
      />

      <section aria-label="Progress payroll">
        <Card className="border-border/80 bg-white shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base font-bold uppercase tracking-[0.08em] text-navy">
              Progress Payroll {periodLabel}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Perjalanan enam tahap siklus payroll aktif
            </p>
          </CardHeader>
          <CardContent className="pt-2 pb-6">
            <PayrollPipeline stages={pipeline} />
          </CardContent>
        </Card>
      </section>

      <section aria-label="Key performance indicators">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {executiveKpis.map((item, index) => (
            <KpiCard key={item.label} item={item} index={index} />
          ))}
        </div>
      </section>

      <section
        aria-label="Business insight and attention"
        className="grid gap-5 lg:grid-cols-5"
      >
        <div className="lg:col-span-3">
          <BusinessInsightPanel initial={initialIntelligence} />
        </div>
        <div className="lg:col-span-2">
          <AttentionCenter alerts={dashboardAlerts} />
        </div>
      </section>

      <section
        aria-label="Payroll by client and trend"
        className="grid gap-5 lg:grid-cols-5"
      >
        <Card className="border-border/80 bg-white shadow-soft lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display text-base font-bold uppercase tracking-[0.08em] text-navy">
              Payroll by Client / Project
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ringkasan bruto dan status per client
            </p>
          </CardHeader>
          <CardContent>
            <ClientPayrollTable rows={clientRows} />
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-white shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base font-bold uppercase tracking-[0.08em] text-navy">
              Payroll Trend (6 Bulan Terakhir)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Nilai payroll dalam Rp miliar
            </p>
          </CardHeader>
          <CardContent className="h-72">
            <ChartsLazy
              data={chartData.map((d) => ({
                ...d,
                amount: d.amount / 1000,
              }))}
            />
          </CardContent>
        </Card>
      </section>

      <section
        aria-label="Activity and quick actions"
        className="grid gap-5 lg:grid-cols-5"
      >
        <Card className="border-border/80 bg-white shadow-soft lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-display text-base font-bold uppercase tracking-[0.08em] text-navy">
              Aktivitas Terbaru
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ringkasan aktivitas operasional
            </p>
          </CardHeader>
          <CardContent className="max-h-[360px] overflow-y-auto">
            <ActivityTimeline items={auditLogs.slice(0, 8)} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <div className="mb-3">
            <h2 className="font-display text-base font-bold uppercase tracking-[0.08em] text-navy">
              Quick Actions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aksi cepat operasional payroll
            </p>
          </div>
          <QuickActions />
        </div>
      </section>
    </div>
  );
}
