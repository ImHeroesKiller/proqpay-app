/**
 * Indonesia Payroll Command Center — data layer.
 * All KPIs from DB; geography from controlled mapping; no multi-country ops.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { canViewSalesPipeline } from "@/lib/auth/permissions";
import { measure, createQueryCounter } from "@/lib/perf";
import type { GeoFilters, GeoRef } from "@/lib/data/geography/types";
import {
  resolveCompanyGeo,
  resolveProjectGeo,
} from "@/lib/data/geography/operational-mapping";
import { ID_PROVINCES, citiesForProvince } from "@/lib/data/geography/reference";
import { hascFromCityCode } from "@/lib/data/geography/topology-join";
import {
  formatCompactIDR,
  formatFullIDR,
  payrollMetricLabel,
  mapTitleForPeriod,
} from "@/lib/format/idr";
import { routes } from "@/lib/routes/app-routes";
import {
  buildReceivablesSummary,
  type ReceivablesSummary,
} from "@/lib/data/receivables";

export type ExecKpi = {
  id: string;
  label: string;
  value: string;
  fullValue: string;
  delta: string;
  hint: string;
  href: string;
};

export type CityMapMetric = {
  cityCode: string;
  cityName: string;
  provinceCode: string;
  provinceName: string;
  hasc2: string | null;
  payrollValue: number;
  metricLabel: "Actual Payroll Value" | "Draft Payroll Value";
  employeeCount: number;
  clientCount: number;
  projectCount: number;
  fundingType: string;
  periodName: string;
  periodId: string;
  status: string;
  share: number;
};

export type CityRankingRow = CityMapMetric & { rank: number };

export type RecentCycleRow = {
  id: string;
  period: string;
  client: string;
  project: string;
  province: string;
  city: string;
  headcount: number;
  totalNet: number;
  totalNetCompact: string;
  status: string;
  fundingType: string;
  href: string;
  companyId: string;
  isInternal: boolean;
};

export type ExecInsight = {
  id: string;
  tone: "success" | "info" | "warning";
  title: string;
  body: string;
  href: string;
  cta: string;
};

export type ExecAlert = {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info" | "warning";
  entity: string;
  detail: string;
  href: string;
  cta: string;
  period?: string;
};

export type TrendPoint = {
  period: string;
  periodId: string;
  amount: number;
  status: string;
  href: string;
};

export type SelectedPeriod = {
  id: string;
  name: string;
  status: string;
  totalNet: number;
  employeeCount: number;
  fundingModel: string;
  companyId: string;
  companyName: string;
  clientType: string | null;
};

export type ExecutiveDashboardData = {
  positioning: {
    title: string;
    subtitle: string;
    context: string;
  };
  breadcrumb: string[];
  filters: GeoFilters;
  selectedPeriod: SelectedPeriod | null;
  map: {
    title: string;
    subtitle: string;
    metricLabel: string;
    domainMax: number;
    cities: CityMapMetric[];
  };
  cityRanking: CityRankingRow[];
  kpis: ExecKpi[];
  payrollTrend: TrendPoint[];
  recentCycles: RecentCycleRow[];
  insights: ExecInsight[];
  alerts: ExecAlert[];
  receivables: ReceivablesSummary;
  validation: {
    historicalPayroll: number;
    junePayroll: number;
    julyPayroll: number;
    draftPayroll: number;
    pipeline: number;
    existingClients: number;
    prospectClients: number;
    ateEmployees: number;
    internalEmployees: number;
    totalEmployees: number;
    prospectCompletedPayroll: number;
  };
  meta: {
    queryCount: number;
    durationMs: number;
    geoSource: "controlled_operational_mapping";
  };
};

function num(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

function executiveCompanyWhere(
  scope: SessionScope,
): Prisma.CompanyWhereInput | undefined {
  if (scope.role === "SUPER_ADMIN" || scope.role === "DIRECTOR") {
    return scope.companyId ? { id: scope.companyId } : undefined;
  }
  if (scope.companyId) return { id: scope.companyId };
  return { id: "00000000-0000-0000-0000-000000000000" };
}

function payrollCompanyWhere(
  scope: SessionScope,
): Prisma.PayrollPeriodWhereInput {
  if (scope.role === "SUPER_ADMIN" || scope.role === "DIRECTOR") {
    return scope.companyId ? { companyId: scope.companyId } : {};
  }
  if (scope.companyId) return { companyId: scope.companyId };
  return { companyId: "00000000-0000-0000-0000-000000000000" };
}

function matchesGeo(geo: GeoRef, filters: GeoFilters): boolean {
  if (filters.province && filters.province !== "ALL") {
    if (geo.provinceCode !== filters.province) return false;
  }
  if (filters.city && filters.city !== "ALL") {
    if (geo.cityCode !== filters.city) return false;
  }
  if (filters.site && filters.site !== "ALL") {
    if (geo.siteCode !== filters.site) return false;
  }
  return true;
}

function inScopeClientType(
  clientType: string | null | undefined,
  scopeFilter: string | null | undefined,
): boolean {
  const s = (scopeFilter ?? "client").toLowerCase();
  if (s === "all") return true;
  if (s === "internal") return clientType === "INTERNAL";
  // client (default): EXISTING + PROSPECT for lists; payroll KPIs further restrict
  return clientType === "EXISTING" || clientType === "PROSPECT";
}

function resolveDefaultPeriod<
  T extends { id: string; name: string; status: string; periodStart: Date },
>(periods: T[], preferredId?: string | null): T | null {
  if (preferredId && preferredId !== "ALL") {
    const hit = periods.find((p) => p.id === preferredId);
    if (hit) return hit;
  }
  const draft = periods.find(
    (p) =>
      p.status === "DRAFT" ||
      p.status === "WAITING" ||
      p.status === "APPROVED",
  );
  if (draft) return draft;
  const closed = periods.find((p) => p.status === "CLOSED");
  return closed ?? periods[0] ?? null;
}

const loaders = new Map<string, Promise<ExecutiveDashboardData>>();

export function getExecutiveDashboardData(
  scope: SessionScope,
  filters: GeoFilters = {},
): Promise<ExecutiveDashboardData> {
  const key = JSON.stringify({
    u: scope.userId,
    r: scope.role,
    c: scope.companyId ?? null,
    f: filters,
  });
  let p = loaders.get(key);
  if (!p) {
    p = measure(
      "executive.dashboard.total",
      () => fetchExecutiveDashboard(scope, filters),
      { route: "/dashboard", operation: "executive.bundle" },
    ).finally(() => {
      setTimeout(() => loaders.delete(key), 0);
    });
    loaders.set(key, p);
  }
  return p;
}

async function fetchExecutiveDashboard(
  scope: SessionScope,
  filtersIn: GeoFilters,
): Promise<ExecutiveDashboardData> {
  const counter = createQueryCounter();
  const t0 = performance.now();
  const companyFilter = executiveCompanyWhere(scope);
  const periodBase = payrollCompanyWhere(scope);
  const scopeFilter = (filtersIn.scope ?? "client").toLowerCase();

  const [
    companies,
    projects,
    employeesByCompany,
    periods,
    sales,
    pendingApprovals,
    wcRequests,
  ] = await Promise.all([
    prisma.company.findMany({
      where: companyFilter,
      select: {
        id: true,
        name: true,
        clientType: true,
        lifecycleStatus: true,
      },
    }),
    prisma.project.findMany({
      where: companyFilter ? { company: companyFilter } : undefined,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        companyId: true,
        company: { select: { name: true, clientType: true } },
      },
    }),
    prisma.employee.groupBy({
      by: ["companyId", "status"],
      where: companyFilter ? { company: companyFilter } : undefined,
      _count: { _all: true },
    }),
    prisma.payrollPeriod.findMany({
      where: periodBase,
      orderBy: { periodStart: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        totalNet: true,
        employeeCount: true,
        fundingModel: true,
        companyId: true,
        periodStart: true,
        payDate: true,
        company: { select: { name: true, clientType: true } },
        projectId: true,
      },
    }),
    canViewSalesPipeline(scope.role)
      ? prisma.salesOpportunity.findMany({
          where: { status: "OPEN" },
          select: {
            id: true,
            prospectName: true,
            status: true,
            estimatedPayrollValue: true,
            companyId: true,
            company: { select: { name: true, clientType: true } },
          },
        })
      : Promise.resolve([]),
    prisma.approvalStep.count({ where: { status: "PENDING" } }),
    prisma.workingCapitalRequest.findMany({
      where:
        companyFilter && typeof companyFilter.id === "string"
          ? { companyId: companyFilter.id }
          : undefined,
      select: {
        id: true,
        payrollPeriodId: true,
        periodName: true,
        companyId: true,
        approvedAmount: true,
        repaidAmount: true,
        status: true,
        settlementStatus: true,
        dueDate: true,
        company: { select: { name: true } },
      },
    }),
  ]);
  counter.inc(7);

  type Co = (typeof companies)[0] & { geo: GeoRef };
  const companiesGeo: Co[] = companies.map((c) => ({
    ...c,
    geo: resolveCompanyGeo(c.name, c.clientType),
  }));
  const projectsGeo = projects.map((p) => ({
    ...p,
    geo: resolveProjectGeo(p.code, p.company.name, p.company.clientType),
  }));
  const periodsGeo = periods.map((p) => ({
    ...p,
    totalNetN: num(p.totalNet),
    geo: resolveCompanyGeo(p.company.name, p.company.clientType),
  }));
  const salesGeo = sales.map((s) => ({
    ...s,
    estimated: num(s.estimatedPayrollValue),
    geo: resolveCompanyGeo(
      s.company?.name ?? s.prospectName,
      s.company?.clientType ?? "PROSPECT",
    ),
  }));

  const empByCompany = new Map<string, { active: number; all: number }>();
  for (const row of employeesByCompany) {
    const cur = empByCompany.get(row.companyId) ?? { active: 0, all: 0 };
    cur.all += row._count._all;
    if (row.status === "ACTIVE" || row.status === "PROBATION") {
      cur.active += row._count._all;
    }
    empByCompany.set(row.companyId, cur);
  }

  // Default period before other filters that depend on it
  const selectedPeriodRow = resolveDefaultPeriod(
    periodsGeo,
    filtersIn.periodId,
  );

  const filters: GeoFilters = {
    ...filtersIn,
    scope: scopeFilter,
    periodId: selectedPeriodRow?.id ?? filtersIn.periodId ?? "ALL",
  };

  const filteredPeriods = periodsGeo.filter((p) => {
    if (!inScopeClientType(p.company.clientType, scopeFilter)) return false;
    // Default client scope: existing client payroll only for cycles
    if (scopeFilter === "client" && p.company.clientType !== "EXISTING")
      return false;
    if (scopeFilter === "internal" && p.company.clientType !== "INTERNAL")
      return false;
    if (!matchesGeo(p.geo, filters)) return false;
    if (filters.clientId && filters.clientId !== "ALL" && p.companyId !== filters.clientId)
      return false;
    if (
      filters.payrollStatus &&
      filters.payrollStatus !== "ALL" &&
      p.status !== filters.payrollStatus
    )
      return false;
    if (
      filters.fundingType &&
      filters.fundingType !== "ALL" &&
      p.fundingModel !== filters.fundingType
    )
      return false;
    return true;
  });

  // Validation (full org-visible, not over-filtered by city)
  const existingClients = companiesGeo.filter(
    (c) => c.clientType === "EXISTING" && c.lifecycleStatus === "ACTIVE",
  );
  const prospectClients = companiesGeo.filter((c) => c.clientType === "PROSPECT");
  const ate = companiesGeo.find((c) => c.name === "PT Anak Tiga Emas");
  const internal = companiesGeo.find(
    (c) => c.name === "ProQPay Internal Operations",
  );

  const existingClosed = periodsGeo.filter(
    (p) => p.status === "CLOSED" && p.company.clientType === "EXISTING",
  );
  const historicalPayroll = existingClosed.reduce((s, p) => s + p.totalNetN, 0);
  const junePayroll = existingClosed
    .filter((p) => /juni|june/i.test(p.name))
    .reduce((s, p) => s + p.totalNetN, 0);
  const julyPayroll = existingClosed
    .filter((p) => /juli|july/i.test(p.name))
    .reduce((s, p) => s + p.totalNetN, 0);
  const draftPayroll = periodsGeo
    .filter(
      (p) => p.status === "DRAFT" && p.company.clientType === "EXISTING",
    )
    .reduce((s, p) => s + p.totalNetN, 0);
  const pipeline = salesGeo.reduce((s, x) => s + x.estimated, 0);
  const ateEmployees = ate ? empByCompany.get(ate.id)?.all ?? 0 : 0;
  const internalEmployees = internal
    ? empByCompany.get(internal.id)?.all ?? 0
    : 0;
  const totalEmployees = [...empByCompany.values()].reduce(
    (s, e) => s + e.all,
    0,
  );
  const prospectCompletedPayroll = periodsGeo.filter(
    (p) =>
      p.company.clientType === "PROSPECT" &&
      (p.status === "CLOSED" ||
        p.status === "VERIFIED" ||
        p.status === "DISBURSED"),
  ).length;

  // Selected period (for map) — re-resolve within filtered set or keep default
  let selectedPeriod = selectedPeriodRow;
  if (filters.periodId && filters.periodId !== "ALL") {
    selectedPeriod =
      periodsGeo.find((p) => p.id === filters.periodId) ?? selectedPeriodRow;
  }

  // Map metrics: aggregate selected period by city (no random split)
  const mapCities: CityMapMetric[] = [];
  if (selectedPeriod) {
    const periodRows = periodsGeo.filter((p) => {
      if (p.id !== selectedPeriod!.id && selectedPeriod) {
        // single period id
        return p.id === selectedPeriod.id;
      }
      return p.id === selectedPeriod!.id;
    });

    // Group by city for this period only
    const byCity = new Map<
      string,
      {
        value: number;
        employees: number;
        companies: Set<string>;
        projects: Set<string>;
        funding: string;
        geo: GeoRef;
        status: string;
        name: string;
        companyName: string;
        clientType: string | null;
      }
    >();

    for (const p of periodRows) {
      // Scope for map values
      if (scopeFilter === "client" && p.company.clientType !== "EXISTING")
        continue;
      if (scopeFilter === "internal" && p.company.clientType !== "INTERNAL")
        continue;
      if (!matchesGeo(p.geo, filters)) continue;

      const cityKey = p.geo.cityCode ?? "UNASSIGNED";
      const cur = byCity.get(cityKey) ?? {
        value: 0,
        employees: 0,
        companies: new Set<string>(),
        projects: new Set<string>(),
        funding: p.fundingModel,
        geo: p.geo,
        status: p.status,
        name: p.name,
        companyName: p.company.name,
        clientType: p.company.clientType,
      };
      cur.value += p.totalNetN;
      cur.employees += p.employeeCount;
      cur.companies.add(p.companyId);
      if (p.projectId) cur.projects.add(p.projectId);
      byCity.set(cityKey, cur);
    }

    // Also count projects in city for selected companies
    for (const proj of projectsGeo) {
      if (scopeFilter === "client" && proj.company.clientType !== "EXISTING")
        continue;
      if (scopeFilter === "internal" && proj.company.clientType !== "INTERNAL")
        continue;
      const cityKey = proj.geo.cityCode ?? "UNASSIGNED";
      const cur = byCity.get(cityKey);
      if (cur) cur.projects.add(proj.id);
    }

    const totalValue = [...byCity.values()].reduce((s, c) => s + c.value, 0);
    for (const [cityKey, cur] of byCity) {
      if (cityKey === "UNASSIGNED" && cur.value === 0) continue;
      mapCities.push({
        cityCode: cur.geo.cityCode ?? cityKey,
        cityName: cur.geo.cityName ?? "Unassigned",
        provinceCode: cur.geo.provinceCode ?? "UNASSIGNED",
        provinceName: cur.geo.provinceName ?? "Unassigned",
        hasc2: hascFromCityCode(cur.geo.cityCode ?? "") ,
        payrollValue: cur.value,
        metricLabel: payrollMetricLabel(cur.status),
        employeeCount: cur.employees,
        clientCount: cur.companies.size,
        projectCount: cur.projects.size,
        fundingType:
          cur.funding === "SELF_FUNDED" ? "Self Funded" : "Working Capital",
        periodName: selectedPeriod.name,
        periodId: selectedPeriod.id,
        status: cur.status,
        share: totalValue > 0 ? cur.value / totalValue : 0,
      });
    }
  }

  const domainMax = Math.max(0, ...mapCities.map((c) => c.payrollValue));
  const cityRanking: CityRankingRow[] = [...mapCities]
    .sort((a, b) => b.payrollValue - a.payrollValue)
    .map((c, i) => ({ ...c, rank: i + 1 }));

  // KPIs (validation-backed; integrity uses full org scope)
  const activeClientEmployees = existingClients.reduce(
    (s, c) => s + (empByCompany.get(c.id)?.active ?? 0),
    0,
  );
  const closedCount = existingClosed.length;
  const relevantPeriods = periodsGeo.filter(
    (p) => p.company.clientType === "EXISTING",
  ).length;
  const completionPct =
    relevantPeriods > 0
      ? Math.round((closedCount / relevantPeriods) * 100)
      : 0;

  const draftPeriod = periodsGeo.find(
    (p) => p.status === "DRAFT" && p.company.clientType === "EXISTING",
  );

  const kpis: ExecKpi[] = [
    {
      id: "hist",
      label: "Historical Client Payroll",
      value: formatCompactIDR(historicalPayroll),
      fullValue: formatFullIDR(historicalPayroll),
      delta: `${closedCount} completed periods`,
      hint: "CLOSED existing-client totalNet",
      href: routes.payroll.list({
        status: "CLOSED",
        clientType: "EXISTING",
      }),
    },
    {
      id: "draft",
      label: "Current Draft Payroll",
      value: formatCompactIDR(draftPayroll),
      fullValue: formatFullIDR(draftPayroll),
      delta: draftPeriod?.name ?? "No draft period",
      hint: "DRAFT existing-client only",
      href: draftPeriod
        ? routes.payroll.detail(draftPeriod.id)
        : routes.payroll.list({ status: "DRAFT" }),
    },
    {
      id: "pipe",
      label: "Prospect Pipeline",
      value: formatCompactIDR(
        canViewSalesPipeline(scope.role) ? pipeline : 0,
      ),
      fullValue: formatFullIDR(
        canViewSalesPipeline(scope.role) ? pipeline : 0,
      ),
      delta: `${prospectClients.length} prospective clients`,
      hint: "OPEN estimated payroll — not completed",
      href: routes.sales.list({ clientType: "PROSPECT" }),
    },
    {
      id: "ex",
      label: "Existing Clients",
      value: String(existingClients.length),
      fullValue: String(existingClients.length),
      delta: "Active managed",
      hint: "clientType EXISTING",
      href: routes.clients.list({ type: "EXISTING" }),
    },
    {
      id: "pr",
      label: "Prospect Clients",
      value: String(prospectClients.length),
      fullValue: String(prospectClients.length),
      delta: "No completed payroll",
      hint: "clientType PROSPECT",
      href: routes.clients.list({ type: "PROSPECT" }),
    },
    {
      id: "emp",
      label: "Active Client Employees",
      value: String(activeClientEmployees),
      fullValue: String(activeClientEmployees),
      delta: ate?.name ?? "Existing clients",
      hint: "ACTIVE + PROBATION on EXISTING",
      href: routes.employees.list({ scope: "client", status: "ACTIVE" }),
    },
    {
      id: "int",
      label: "Internal Employees",
      value: String(internalEmployees),
      fullValue: String(internalEmployees),
      delta: "Excluded from client payroll KPIs",
      hint: "INTERNAL company",
      href: routes.employees.list({ scope: "internal", status: "ACTIVE" }),
    },
    {
      id: "done",
      label: "Payroll Completion",
      value: `${completionPct}%`,
      fullValue: `${closedCount} of ${relevantPeriods} existing periods closed`,
      delta: `${closedCount} closed / ${relevantPeriods} periods`,
      hint: "Existing-client periods only",
      href: routes.payroll.list(),
    },
  ];

  const payrollTrend: TrendPoint[] = [...periodsGeo]
    .filter((p) => p.company.clientType === "EXISTING")
    .sort(
      (a, b) =>
        new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime(),
    )
    .map((p) => ({
      period: p.name,
      periodId: p.id,
      amount: p.totalNetN,
      status: p.status,
      href: routes.payroll.detail(p.id),
    }));

  const projectByCompany = new Map(
    projectsGeo.map((p) => [p.companyId, p]),
  );
  const recentCycles: RecentCycleRow[] = filteredPeriods
    .slice(0, 12)
    .map((p) => {
      const proj = projectByCompany.get(p.companyId);
      return {
        id: p.id,
        period: p.name,
        client: p.company.name,
        project: proj?.code ?? "—",
        province: p.geo.provinceName ?? "Unassigned",
        city: p.geo.cityName ?? "Unassigned",
        headcount: p.employeeCount,
        totalNet: p.totalNetN,
        totalNetCompact: formatCompactIDR(p.totalNetN),
        status: p.status,
        fundingType:
          p.fundingModel === "SELF_FUNDED" ? "Self Funded" : "Working Capital",
        href: routes.payroll.detail(p.id),
        companyId: p.companyId,
        isInternal: p.company.clientType === "INTERNAL",
      };
    });

  const insights: ExecInsight[] = [];
  if (historicalPayroll > 0) {
    insights.push({
      id: "i-hist",
      tone: "success",
      title: "Historical client payroll completed",
      body: `Historical client payroll reached ${formatCompactIDR(historicalPayroll)} across June and July 2026.`,
      href: routes.payroll.list({ status: "CLOSED", clientType: "EXISTING" }),
      cta: "View payroll history",
    });
  }
  if (draftPayroll > 0) {
    insights.push({
      id: "i-draft",
      tone: "warning",
      title: "August draft remains open",
      body: `August draft payroll is ${formatCompactIDR(draftPayroll)}. Funds are not yet treated as disbursed.`,
      href: draftPeriod
        ? routes.payroll.detail(draftPeriod.id)
        : routes.payroll.list({ status: "DRAFT" }),
      cta: "View current draft",
    });
  }
  if (pipeline > 0 && canViewSalesPipeline(scope.role)) {
    insights.push({
      id: "i-pipe",
      tone: "info",
      title: "Prospect pipeline is open",
      body: `Prospect pipeline totals ${formatCompactIDR(pipeline)} across ${prospectClients.length} prospective clients.`,
      href: routes.sales.list({ clientType: "PROSPECT" }),
      cta: "View pipeline",
    });
  }
  const jakbar = mapCities.find((c) => c.cityCode === "ID-JK-JB");
  if (jakbar && jakbar.share >= 0.99) {
    insights.push({
      id: "i-conc",
      tone: "info",
      title: "Payroll concentrated in Jakarta Barat",
      body: "Existing-client payroll for the selected period is concentrated in Jakarta Barat.",
      href: routes.dashboard({
        province: "ID-JK",
        city: "ID-JK-JB",
        period: selectedPeriod?.id,
        scope: "client",
      }),
      cta: "Review geographic mapping",
    });
  }
  const unassignedProspects = prospectClients.filter((c) => !c.geo.provinceCode);
  if (unassignedProspects.length) {
    insights.push({
      id: "i-un",
      tone: "warning",
      title: "Prospect geographic assignment incomplete",
      body: `${unassignedProspects.length} prospect(s) do not yet have province and city assignments.`,
      href: routes.sales.list({ clientType: "PROSPECT" }),
      cta: "Review prospects",
    });
  }
  const selfFunded = existingClosed.every(
    (p) => p.fundingModel === "SELF_FUNDED",
  );
  if (selfFunded && existingClosed.length) {
    insights.push({
      id: "i-fund",
      tone: "success",
      title: "Completed cycles are self-funded",
      body: "Completed payroll cycles for existing clients use client self-funded transfer model.",
      href: routes.payroll.list({ status: "CLOSED" }),
      cta: "Open payroll",
    });
  }

  const alerts: ExecAlert[] = [];
  if (draftPeriod) {
    alerts.push({
      id: "a-draft",
      type: "Draft Payroll Pending",
      severity: "warning",
      entity: draftPeriod.name,
      detail: `${draftPeriod.name} payroll remains in Draft.`,
      href: routes.payroll.detail(draftPeriod.id),
      cta: "Open period",
      period: draftPeriod.name,
    });
  }
  if (unassignedProspects.length) {
    alerts.push({
      id: "a-un",
      type: "Prospect Location Unassigned",
      severity: "warning",
      entity: `${unassignedProspects.length} prospects`,
      detail:
        "Prospects do not yet have province and city assignments in operational mapping.",
      href: routes.sales.list({ clientType: "PROSPECT" }),
      cta: "Review prospects",
    });
  }
  if (jakbar && jakbar.share >= 0.99 && selectedPeriod) {
    alerts.push({
      id: "a-conc",
      type: "Geographic Concentration",
      severity: "info",
      entity: "Jakarta Barat",
      detail:
        "100% of existing-client payroll for the selected period is concentrated in Jakarta Barat.",
      href: routes.dashboard({
        province: "ID-JK",
        city: "ID-JK-JB",
        period: selectedPeriod.id,
        scope: "client",
      }),
      cta: "Filter Jakarta Barat",
      period: selectedPeriod.name,
    });
  }
  if (
    draftPeriod &&
    !["WAITING", "APPROVED"].includes(draftPeriod.status) &&
    draftPeriod.status === "DRAFT"
  ) {
    alerts.push({
      id: "a-submit",
      type: "Current Cycle Not Submitted",
      severity: "warning",
      entity: draftPeriod.name,
      detail: "Current payroll cycle has not entered approval.",
      href: routes.payroll.detail(draftPeriod.id),
      cta: "Open cycle",
      period: draftPeriod.name,
    });
  }
  if (prospectCompletedPayroll === 0 && prospectClients.length) {
    alerts.push({
      id: "a-sep",
      type: "No Completed Prospect Payroll",
      severity: "info",
      entity: "Pipeline separation",
      detail:
        "Prospect pipeline remains separated from actual completed payroll.",
      href: routes.sales.list({ clientType: "PROSPECT" }),
      cta: "View pipeline",
    });
  }
  if (pendingApprovals > 0) {
    alerts.push({
      id: "a-appr",
      type: "Pending Approvals",
      severity: "high",
      entity: "Workflow",
      detail: `${pendingApprovals} approval step(s) pending.`,
      href: routes.approval.list(),
      cta: "Open approvals",
    });
  }

  const receivables = buildReceivablesSummary({
    periods: periodsGeo.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      fundingModel: p.fundingModel,
      totalNet: p.totalNetN,
      companyId: p.companyId,
      companyName: p.company.name,
      clientType: p.company.clientType,
      payDate: p.payDate,
    })),
    wcRequests: wcRequests.map((w) => ({
      id: w.id,
      payrollPeriodId: w.payrollPeriodId,
      periodName: w.periodName,
      companyId: w.companyId,
      companyName: w.company?.name ?? null,
      approvedAmount: num(w.approvedAmount),
      repaidAmount: num(w.repaidAmount),
      status: w.status,
      settlementStatus: w.settlementStatus,
      dueDate: w.dueDate,
    })),
    selectedPeriodId: selectedPeriod?.id,
    routes: {
      payrollDetail: (id) => routes.payroll.detail(id),
      workingCapital: () => routes.workingCapital.list(),
      payrollList: (q) =>
        routes.payroll.list({
          status: q?.status,
        }),
    },
  });

  if (receivables.draftFundingRequirement > 0 && draftPeriod) {
    alerts.push({
      id: "a-fund-req",
      type: "Payroll period requires funding plan",
      severity: "info",
      entity: draftPeriod.name,
      detail: `Draft funding requirement ${formatCompactIDR(receivables.draftFundingRequirement)} — not yet outstanding AR.`,
      href: routes.payroll.detail(draftPeriod.id),
      cta: "Open draft period",
      period: draftPeriod.name,
    });
  }
  if (receivables.workingCapitalUsed > 0) {
    alerts.push({
      id: "a-wc",
      type: "Working capital exposure present",
      severity: "medium",
      entity: "Treasury",
      detail: `Working capital used ${formatCompactIDR(receivables.workingCapitalUsed)}.`,
      href: routes.workingCapital.list(),
      cta: "Open working capital",
    });
  }
  if (receivables.overdue > 0) {
    alerts.push({
      id: "a-od",
      type: "Receivable overdue",
      severity: "high",
      entity: "Working capital settlement",
      detail: `Overdue exposure ${formatCompactIDR(receivables.overdue)}.`,
      href: routes.workingCapital.list(),
      cta: "Review overdue",
    });
  }

  const breadcrumb = ["Indonesia"];
  if (filters.province && filters.province !== "ALL") {
    breadcrumb.push(
      ID_PROVINCES.find((p) => p.code === filters.province)?.name ??
        filters.province,
    );
  }
  if (filters.city && filters.city !== "ALL") {
    const cityName =
      mapCities.find((c) => c.cityCode === filters.city)?.cityName ??
      citiesForProvince(filters.province ?? "")
        .find((c) => c.code === filters.city)?.name ??
      filters.city;
    breadcrumb.push(cityName);
  }
  if (filters.projectId && filters.projectId !== "ALL") {
    const pr = projects.find((p) => p.id === filters.projectId);
    if (pr) breadcrumb.push(pr.code);
  }

  const selectedPeriodOut: SelectedPeriod | null = selectedPeriod
    ? {
        id: selectedPeriod.id,
        name: selectedPeriod.name,
        status: selectedPeriod.status,
        totalNet: selectedPeriod.totalNetN,
        employeeCount: selectedPeriod.employeeCount,
        fundingModel: selectedPeriod.fundingModel,
        companyId: selectedPeriod.companyId,
        companyName: selectedPeriod.company.name,
        clientType: selectedPeriod.company.clientType,
      }
    : null;

  return {
    positioning: {
      title: "Indonesia Payroll Command Center",
      subtitle:
        "Executive monitoring of payroll operations, workforce, clients, funding, and delivery across Indonesia.",
      context:
        "Designed for nationwide payroll operations across provinces, cities, projects, and client locations.",
    },
    breadcrumb,
    filters,
    selectedPeriod: selectedPeriodOut,
    map: {
      title: mapTitleForPeriod(
        selectedPeriodOut?.name ?? null,
        selectedPeriodOut?.status ?? null,
      ),
      subtitle:
        "Actual or draft payroll value by operational city/regency for the selected period. Prospects are excluded from the heatmap.",
      metricLabel: payrollMetricLabel(selectedPeriodOut?.status),
      domainMax,
      cities: mapCities,
    },
    cityRanking,
    kpis,
    payrollTrend,
    recentCycles,
    insights,
    alerts,
    receivables,
    validation: {
      historicalPayroll,
      junePayroll,
      julyPayroll,
      draftPayroll,
      pipeline,
      existingClients: existingClients.length,
      prospectClients: prospectClients.length,
      ateEmployees,
      internalEmployees,
      totalEmployees,
      prospectCompletedPayroll,
    },
    meta: {
      queryCount: counter.get(),
      durationMs: Math.round(performance.now() - t0),
      geoSource: "controlled_operational_mapping",
    },
  };
}

export async function getExecutiveFilterOptions(scope: SessionScope) {
  const companyFilter = executiveCompanyWhere(scope);
  const [companies, projects, periods] = await Promise.all([
    prisma.company.findMany({
      where: companyFilter,
      select: { id: true, name: true, clientType: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: companyFilter ? { company: companyFilter } : undefined,
      select: { id: true, code: true, name: true, companyId: true },
      orderBy: { code: "asc" },
    }),
    prisma.payrollPeriod.findMany({
      where: payrollCompanyWhere(scope),
      select: {
        id: true,
        name: true,
        status: true,
        fundingModel: true,
        periodStart: true,
      },
      orderBy: { periodStart: "desc" },
      take: 24,
    }),
  ]);

  const defaultPeriod = resolveDefaultPeriod(periods, null);

  return {
    defaultPeriodId: defaultPeriod?.id ?? null,
    scopes: [
      { value: "client", label: "Client" },
      { value: "internal", label: "Internal" },
      { value: "all", label: "All" },
    ],
    provinces: [
      { value: "ALL", label: "All provinces" },
      ...ID_PROVINCES.map((p) => ({ value: p.code, label: p.name })),
    ],
    clientTypes: [
      { value: "ALL", label: "All types" },
      { value: "EXISTING", label: "Existing" },
      { value: "PROSPECT", label: "Prospect" },
      { value: "INTERNAL", label: "Internal" },
    ],
    clients: [
      { value: "ALL", label: "All clients" },
      ...companies.map((c) => ({ value: c.id, label: c.name })),
    ],
    projects: [
      { value: "ALL", label: "All projects" },
      ...projects.map((p) => ({
        value: p.id,
        label: `${p.code} — ${p.name}`,
        companyId: p.companyId,
      })),
    ],
    periods: [
      { value: "ALL", label: "All periods" },
      ...periods.map((p) => ({
        value: p.id,
        label: p.name,
        status: p.status,
      })),
    ],
    statuses: [
      { value: "ALL", label: "All statuses" },
      ...[...new Set(periods.map((p) => p.status))].map((s) => ({
        value: s,
        label: s.replaceAll("_", " "),
      })),
    ],
    fundingTypes: [
      { value: "ALL", label: "All funding" },
      { value: "SELF_FUNDED", label: "Self-funded" },
      { value: "WORKING_CAPITAL", label: "Working capital" },
    ],
    sites: [
      { value: "ALL", label: "All sites" },
      {
        value: "SITE-ATE-JAKBAR-01",
        label: "ATE Client Office — Jakarta Barat",
      },
      {
        value: "SITE-MSG-HO-01",
        label: "ProQPay Processing Center — Jakarta Pusat",
      },
    ],
  };
}
