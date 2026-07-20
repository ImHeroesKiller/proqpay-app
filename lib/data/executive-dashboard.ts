/**
 * Executive Command Center — Indonesia-first geographic dashboard data layer.
 *
 * - KPIs from database (actual / draft / pipeline separated)
 * - Geography from controlled operational mapping (Approach B) — no fake countries
 * - Tenant scope preserved
 * - Single parallel query batch + request-scoped React cache
 */

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/utils";
import type { SessionScope } from "@/lib/auth/scope";
import { canViewSalesPipeline } from "@/lib/auth/permissions";
import { measure, createQueryCounter } from "@/lib/perf";
import type { GeoFilters, GeoRef } from "@/lib/data/geography/types";
import {
  ID_PROVINCES,
  STRATEGIC_PROVINCES_Y1_CORE,
  STRATEGIC_PROVINCES_Y2,
  STRATEGIC_PROVINCES_Y3,
} from "@/lib/data/geography/reference";
import {
  isClientFacingActive,
  resolveCompanyGeo,
  resolveProjectGeo,
} from "@/lib/data/geography/operational-mapping";

export type ExecKpi = {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "neutral";
  hint: string;
  category: "primary" | "geographic";
};

export type ProvinceFootprint = {
  code: string;
  name: string;
  status: "ACTIVE_OPERATION" | "PROSPECT" | "STRATEGIC_EXPANSION" | "NO_DATA";
  clientCount: number;
  projectCount: number;
  employeeCount: number;
  historicalPayroll: number;
  draftPayroll: number;
  pipeline: number;
};

export type CityBreakdown = {
  code: string | null;
  name: string;
  clientCount: number;
  projectCount: number;
  employeeCount: number;
  historicalPayroll: number;
  draftPayroll: number;
  pipeline: number;
  lastStatus: string | null;
  alerts: number;
};

export type RecentCycleRow = {
  id: string;
  period: string;
  country: string;
  province: string;
  city: string;
  site: string;
  client: string;
  project: string;
  headcount: number;
  totalNet: number;
  totalNetLabel: string;
  status: string;
  fundingType: string;
  companyId: string;
};

export type ExecInsight = {
  id: string;
  tone: "success" | "info" | "warning" | "danger";
  title: string;
  body: string;
};

export type ExecAlert = {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  entity: string;
  detail: string;
};

export type TrendPoint = { period: string; amount: number; status: string };

export type ExecutiveDashboardData = {
  positioning: {
    title: string;
    subtitle: string;
    context: string;
  };
  breadcrumb: string[];
  filters: GeoFilters;
  kpis: ExecKpi[];
  geographicSummary: {
    activeCountries: number;
    activeProvinces: number;
    activeCities: number;
    activeSites: number;
    unassignedClients: number;
  };
  provinceDistribution: ProvinceFootprint[];
  cityDistribution: CityBreakdown[];
  payrollTrend: TrendPoint[];
  workforceByProvince: { name: string; count: number }[];
  portfolioByGeo: { name: string; existing: number; prospect: number }[];
  pipelineByGeo: { name: string; amount: number }[];
  workflowByStatus: { status: string; count: number }[];
  recentCycles: RecentCycleRow[];
  insights: ExecInsight[];
  alerts: ExecAlert[];
  roadmap: {
    year: number;
    title: string;
    status: "Actual" | "Committed" | "Planned";
    focus: string[];
    capabilities: string[];
  }[];
  validation: {
    historicalPayroll: number;
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
  if (filters.country && filters.country !== "ALL") {
    if (geo.countryCode !== filters.country) return false;
  }
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

function num(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

function cacheKey(scope: SessionScope, filters: GeoFilters): string {
  return JSON.stringify({
    u: scope.userId,
    r: scope.role,
    c: scope.companyId ?? null,
    f: filters,
  });
}

/** Per-request cache keyed by scope + filters. */
const loaders = new Map<string, Promise<ExecutiveDashboardData>>();

export function getExecutiveDashboardData(
  scope: SessionScope,
  filters: GeoFilters = {},
): Promise<ExecutiveDashboardData> {
  const key = cacheKey(scope, filters);
  let p = loaders.get(key);
  if (!p) {
    p = measure(
      "executive.dashboard.total",
      () => fetchExecutiveDashboard(scope, filters),
      { route: "/dashboard", operation: "executive.bundle" },
    ).finally(() => {
      // Drop after tick so parallel RSC sections still share; next request rebuilds
      setTimeout(() => loaders.delete(key), 0);
    });
    loaders.set(key, p);
  }
  return p;
}

/** React cache wrapper for stable server components. */
export const loadExecutiveDashboard = cache(
  async (
    userId: string,
    role: SessionScope["role"],
    companyId: string | null | undefined,
    filtersJson: string,
  ): Promise<ExecutiveDashboardData> => {
    const filters = (
      filtersJson ? JSON.parse(filtersJson) : {}
    ) as GeoFilters;
    return getExecutiveDashboardData(
      { userId, role, companyId: companyId ?? null },
      filters,
    );
  },
);

async function fetchExecutiveDashboard(
  scope: SessionScope,
  filters: GeoFilters,
): Promise<ExecutiveDashboardData> {
  const counter = createQueryCounter();
  const t0 = performance.now();
  const companyFilter = executiveCompanyWhere(scope);
  const periodBase = payrollCompanyWhere(scope);

  const [
    companies,
    projects,
    employeesByCompany,
    periods,
    sales,
    pendingApprovals,
  ] = await Promise.all([
    prisma.company.findMany({
      where: companyFilter,
      select: {
        id: true,
        name: true,
        clientType: true,
        lifecycleStatus: true,
        address: true,
      },
    }),
    prisma.project.findMany({
      where: companyFilter ? { company: companyFilter } : undefined,
      select: {
        id: true,
        code: true,
        name: true,
        site: true,
        location: true,
        status: true,
        companyId: true,
        company: { select: { name: true, clientType: true } },
      },
    }),
    prisma.employee.groupBy({
      by: ["companyId", "status"],
      where: companyFilter
        ? { company: companyFilter }
        : undefined,
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
            stage: true,
            estimatedPayrollValue: true,
            weightedPipelineValue: true,
            companyId: true,
            company: { select: { name: true, clientType: true } },
          },
        })
      : Promise.resolve([]),
    prisma.approvalStep.count({ where: { status: "PENDING" } }),
  ]);

  counter.inc(6);

  // Enrich with geo
  type Co = (typeof companies)[0] & { geo: GeoRef };
  const companiesGeo: Co[] = companies.map((c) => ({
    ...c,
    geo: resolveCompanyGeo(c.name, c.clientType),
  }));

  const projectsGeo = projects.map((p) => ({
    ...p,
    geo: resolveProjectGeo(
      p.code,
      p.company.name,
      p.company.clientType,
    ),
  }));

  const periodsGeo = periods.map((p) => ({
    ...p,
    totalNetN: num(p.totalNet),
    geo: resolveCompanyGeo(p.company.name, p.company.clientType),
  }));

  const salesGeo = sales.map((s) => ({
    ...s,
    estimated: num(s.estimatedPayrollValue),
    weighted: num(s.weightedPipelineValue),
    geo: resolveCompanyGeo(
      s.company?.name ?? s.prospectName,
      s.company?.clientType ?? "PROSPECT",
    ),
  }));

  // Employee counts by company
  const empByCompany = new Map<string, { active: number; all: number }>();
  for (const row of employeesByCompany) {
    const cur = empByCompany.get(row.companyId) ?? { active: 0, all: 0 };
    cur.all += row._count._all;
    if (row.status === "ACTIVE" || row.status === "PROBATION") {
      cur.active += row._count._all;
    }
    empByCompany.set(row.companyId, cur);
  }

  // Apply filters
  const fCountry = filters.country ?? "ID";
  const effectiveFilters: GeoFilters = {
    ...filters,
    country: fCountry === "ALL" ? "ALL" : fCountry,
  };

  const filteredCompanies = companiesGeo.filter((c) => {
    if (filters.clientType && filters.clientType !== "ALL") {
      if ((c.clientType ?? "") !== filters.clientType) return false;
    }
    if (filters.clientId && filters.clientId !== "ALL") {
      if (c.id !== filters.clientId) return false;
    }
    return matchesGeo(c.geo, effectiveFilters);
  });
  const companyIds = new Set(filteredCompanies.map((c) => c.id));

  const filteredPeriods = periodsGeo.filter((p) => {
    if (!companyIds.has(p.companyId) && companyIds.size > 0) {
      // if companies filtered empty by geo, keep none
      if (!matchesGeo(p.geo, effectiveFilters)) return false;
    } else if (!matchesGeo(p.geo, effectiveFilters)) return false;
    if (filters.clientId && filters.clientId !== "ALL" && p.companyId !== filters.clientId)
      return false;
    if (filters.periodId && filters.periodId !== "ALL" && p.id !== filters.periodId)
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

  const filteredProjects = projectsGeo.filter((p) => {
    if (filters.projectId && filters.projectId !== "ALL" && p.id !== filters.projectId)
      return false;
    if (filters.clientId && filters.clientId !== "ALL" && p.companyId !== filters.clientId)
      return false;
    return matchesGeo(p.geo, effectiveFilters);
  });

  const filteredSales = salesGeo.filter((s) =>
    matchesGeo(s.geo, effectiveFilters),
  );

  // Validation totals (org-visible, not over-filtered by province when computing integrity)
  const existingClients = companiesGeo.filter(
    (c) => c.clientType === "EXISTING" && c.lifecycleStatus === "ACTIVE",
  );
  const prospectClients = companiesGeo.filter((c) => c.clientType === "PROSPECT");

  const ate = companiesGeo.find((c) => c.name === "PT Anak Tiga Emas");
  const internal = companiesGeo.find(
    (c) => c.name === "ProQPay Internal Operations",
  );

  const historicalPayroll = periodsGeo
    .filter(
      (p) =>
        p.status === "CLOSED" &&
        p.company.clientType === "EXISTING",
    )
    .reduce((s, p) => s + p.totalNetN, 0);

  const draftPayroll = periodsGeo
    .filter(
      (p) =>
        p.status === "DRAFT" && p.company.clientType === "EXISTING",
    )
    .reduce((s, p) => s + p.totalNetN, 0);

  const pipeline = salesGeo
    .filter((s) => s.status === "OPEN")
    .reduce((s, x) => s + x.estimated, 0);

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

  // Filtered KPI numbers (respect geo filter for display strip when scoped)
  const histFiltered = filteredPeriods
    .filter(
      (p) => p.status === "CLOSED" && p.company.clientType === "EXISTING",
    )
    .reduce((s, p) => s + p.totalNetN, 0);
  const draftFiltered = filteredPeriods
    .filter(
      (p) => p.status === "DRAFT" && p.company.clientType === "EXISTING",
    )
    .reduce((s, p) => s + p.totalNetN, 0);
  const pipelineFiltered = filteredSales.reduce((s, x) => s + x.estimated, 0);

  const existingInScope = filteredCompanies.filter(
    (c) => c.clientType === "EXISTING" && c.lifecycleStatus === "ACTIVE",
  );
  const prospectInScope = filteredCompanies.filter(
    (c) => c.clientType === "PROSPECT",
  );
  const activeClientEmployees = existingInScope.reduce(
    (s, c) => s + (empByCompany.get(c.id)?.active ?? 0),
    0,
  );
  const internalEmpInScope = filteredCompanies
    .filter((c) => c.clientType === "INTERNAL")
    .reduce((s, c) => s + (empByCompany.get(c.id)?.all ?? 0), 0);

  // Geographic summary (active ops only, client-facing)
  const activeOpCompanies = filteredCompanies.filter((c) =>
    isClientFacingActive(c.geo, c.clientType),
  );
  const activeCountries = new Set(
    activeOpCompanies.map((c) => c.geo.countryCode),
  ).size;
  const activeProvinces = new Set(
    activeOpCompanies
      .map((c) => c.geo.provinceCode)
      .filter(Boolean) as string[],
  ).size;
  const activeCities = new Set(
    activeOpCompanies.map((c) => c.geo.cityCode).filter(Boolean) as string[],
  ).size;
  const activeSites = new Set(
    activeOpCompanies.map((c) => c.geo.siteCode).filter(Boolean) as string[],
  ).size;
  const unassignedClients = filteredCompanies.filter(
    (c) =>
      c.clientType === "EXISTING" &&
      (c.geo.status === "UNASSIGNED" || !c.geo.provinceCode),
  ).length;

  // Province footprint for Indonesia map
  const provinceDistribution: ProvinceFootprint[] = ID_PROVINCES.map((prov) => {
    const cos = filteredCompanies.filter(
      (c) => c.geo.provinceCode === prov.code,
    );
    const existingHere = cos.filter((c) => c.clientType === "EXISTING");
    const prospectHere = cos.filter((c) => c.clientType === "PROSPECT");
    const projs = filteredProjects.filter(
      (p) => p.geo.provinceCode === prov.code,
    );
    const hist = filteredPeriods
      .filter(
        (p) =>
          p.geo.provinceCode === prov.code &&
          p.status === "CLOSED" &&
          p.company.clientType === "EXISTING",
      )
      .reduce((s, p) => s + p.totalNetN, 0);
    const draft = filteredPeriods
      .filter(
        (p) =>
          p.geo.provinceCode === prov.code &&
          p.status === "DRAFT" &&
          p.company.clientType === "EXISTING",
      )
      .reduce((s, p) => s + p.totalNetN, 0);
    const pipe = filteredSales
      .filter((s) => s.geo.provinceCode === prov.code)
      .reduce((s, x) => s + x.estimated, 0);
    const emp = existingHere.reduce(
      (s, c) => s + (empByCompany.get(c.id)?.active ?? 0),
      0,
    );

    let status: ProvinceFootprint["status"] = "NO_DATA";
    if (existingHere.some((c) => c.geo.status === "ACTIVE_OPERATION")) {
      status = "ACTIVE_OPERATION";
    } else if (prospectHere.length > 0) {
      status = "PROSPECT";
    } else if (
      STRATEGIC_PROVINCES_Y2.includes(prov.code) ||
      STRATEGIC_PROVINCES_Y3.includes(prov.code) ||
      STRATEGIC_PROVINCES_Y1_CORE.includes(prov.code)
    ) {
      // Only mark strategic if no active data — Y1 core with no data still strategic plan for expansion cities
      if (
        !existingHere.length &&
        (STRATEGIC_PROVINCES_Y2.includes(prov.code) ||
          STRATEGIC_PROVINCES_Y3.includes(prov.code) ||
          (STRATEGIC_PROVINCES_Y1_CORE.includes(prov.code) &&
            prov.code !== "ID-JK"))
      ) {
        status = "STRATEGIC_EXPANSION";
      }
    }

    // DKI with active ATE is ACTIVE; other Y1 without ops stay strategic
    if (prov.code === "ID-JK" && existingHere.length) {
      status = "ACTIVE_OPERATION";
    }

    return {
      code: prov.code,
      name: prov.name,
      status,
      clientCount: existingHere.length + prospectHere.length,
      projectCount: projs.length,
      employeeCount: emp,
      historicalPayroll: hist,
      draftPayroll: draft,
      pipeline: pipe,
    };
  });

  // City breakdown for selected province (or all active cities when province ALL)
  const cityMap = new Map<string, CityBreakdown>();
  const citySourceCompanies = filteredCompanies.filter(
    (c) =>
      c.clientType === "EXISTING" ||
      c.clientType === "PROSPECT" ||
      c.clientType === "INTERNAL",
  );
  for (const c of citySourceCompanies) {
    if (
      effectiveFilters.province &&
      effectiveFilters.province !== "ALL" &&
      c.geo.provinceCode !== effectiveFilters.province
    ) {
      continue;
    }
    const key = c.geo.cityCode ?? `unassigned:${c.geo.provinceCode ?? "none"}`;
    const cur = cityMap.get(key) ?? {
      code: c.geo.cityCode,
      name: c.geo.cityName ?? "Unassigned",
      clientCount: 0,
      projectCount: 0,
      employeeCount: 0,
      historicalPayroll: 0,
      draftPayroll: 0,
      pipeline: 0,
      lastStatus: null as string | null,
      alerts: 0,
    };
    if (c.clientType === "EXISTING" || c.clientType === "PROSPECT") {
      cur.clientCount += 1;
    }
    cur.employeeCount += empByCompany.get(c.id)?.active ?? 0;
    cityMap.set(key, cur);
  }
  for (const p of filteredProjects) {
    if (
      effectiveFilters.province &&
      effectiveFilters.province !== "ALL" &&
      p.geo.provinceCode !== effectiveFilters.province
    )
      continue;
    const key = p.geo.cityCode ?? `unassigned:${p.geo.provinceCode ?? "none"}`;
    const cur = cityMap.get(key);
    if (cur) cur.projectCount += 1;
  }
  for (const p of filteredPeriods) {
    if (
      effectiveFilters.province &&
      effectiveFilters.province !== "ALL" &&
      p.geo.provinceCode !== effectiveFilters.province
    )
      continue;
    const key = p.geo.cityCode ?? `unassigned:${p.geo.provinceCode ?? "none"}`;
    const cur = cityMap.get(key);
    if (!cur) continue;
    if (p.status === "CLOSED" && p.company.clientType === "EXISTING") {
      cur.historicalPayroll += p.totalNetN;
    }
    if (p.status === "DRAFT" && p.company.clientType === "EXISTING") {
      cur.draftPayroll += p.totalNetN;
    }
    if (!cur.lastStatus) cur.lastStatus = p.status;
  }
  for (const s of filteredSales) {
    if (
      effectiveFilters.province &&
      effectiveFilters.province !== "ALL" &&
      s.geo.provinceCode !== effectiveFilters.province
    )
      continue;
    const key = s.geo.cityCode ?? `unassigned:${s.geo.provinceCode ?? "none"}`;
    const cur = cityMap.get(key);
    if (cur) cur.pipeline += s.estimated;
  }
  const cityDistribution = [...cityMap.values()].sort(
    (a, b) => b.historicalPayroll + b.draftPayroll - (a.historicalPayroll + a.draftPayroll),
  );

  // Trend — existing client periods only (chronological)
  const payrollTrend: TrendPoint[] = [...filteredPeriods]
    .filter((p) => p.company.clientType === "EXISTING")
    .sort(
      (a, b) =>
        new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime(),
    )
    .map((p) => ({
      period: p.name,
      amount: p.totalNetN,
      status: p.status,
    }));

  const workforceByProvince = provinceDistribution
    .filter((p) => p.employeeCount > 0)
    .map((p) => ({ name: p.name, count: p.employeeCount }));

  const portfolioByGeo = provinceDistribution
    .filter((p) => p.clientCount > 0)
    .map((p) => {
      const existing = filteredCompanies.filter(
        (c) =>
          c.geo.provinceCode === p.code && c.clientType === "EXISTING",
      ).length;
      const prospect = filteredCompanies.filter(
        (c) =>
          c.geo.provinceCode === p.code && c.clientType === "PROSPECT",
      ).length;
      return { name: p.name, existing, prospect };
    });

  const pipelineByGeo = [
    {
      name: "Indonesia (unassigned province)",
      amount: filteredSales
        .filter((s) => !s.geo.provinceCode)
        .reduce((a, s) => a + s.estimated, 0),
    },
    ...provinceDistribution
      .filter((p) => p.pipeline > 0)
      .map((p) => ({ name: p.name, amount: p.pipeline })),
  ].filter((x) => x.amount > 0);

  const statusCounts = new Map<string, number>();
  for (const p of filteredPeriods) {
    statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1);
  }
  const workflowByStatus = [...statusCounts.entries()].map(
    ([status, count]) => ({ status, count }),
  );

  // Recent cycles with location columns
  const projectByCompany = new Map(
    filteredProjects.map((p) => [p.companyId, p]),
  );
  const recentCycles: RecentCycleRow[] = filteredPeriods.slice(0, 12).map((p) => {
    const proj = projectByCompany.get(p.companyId);
    return {
      id: p.id,
      period: p.name,
      country: p.geo.countryName,
      province: p.geo.provinceName ?? "Unassigned",
      city: p.geo.cityName ?? "Unassigned",
      site: p.geo.siteName ?? "—",
      client: p.company.name,
      project: proj?.code ?? "—",
      headcount: p.employeeCount,
      totalNet: p.totalNetN,
      totalNetLabel: formatRupiah(p.totalNetN),
      status: p.status,
      fundingType:
        p.fundingModel === "SELF_FUNDED" ? "Self-funded" : "Working capital",
      companyId: p.companyId,
    };
  });

  // Insights (rule-based, not marketed as AI)
  const insights: ExecInsight[] = [];
  if (historicalPayroll > 0 && activeCountries <= 1) {
    insights.push({
      id: "i-id-only",
      tone: "info",
      title: "Existing-client payroll is Indonesia-concentrated",
      body: `All historical existing-client payroll (${formatRupiah(historicalPayroll)}) is attributed to Indonesia under the current operating footprint.`,
    });
  }
  const jk = provinceDistribution.find((p) => p.code === "ID-JK");
  if (jk && jk.status === "ACTIVE_OPERATION") {
    insights.push({
      id: "i-jk",
      tone: "success",
      title: "Active operations centered in DKI Jakarta",
      body: `DKI Jakarta holds active client operations with ${jk.employeeCount} client-facing active employees and ${formatRupiah(jk.historicalPayroll)} historical payroll.`,
    });
  }
  if (pipeline > 0) {
    insights.push({
      id: "i-pipe",
      tone: "info",
      title: "Prospect pipeline is open",
      body: `${prospectClients.length} prospective client(s) represent ${formatRupiah(pipeline)} estimated payroll pipeline. Prospects are not counted as completed payroll.`,
    });
  }
  if (activeProvinces <= 1) {
    insights.push({
      id: "i-div",
      tone: "warning",
      title: "Geographic diversification is limited",
      body: "Client-facing active operations are concentrated in a single province. Expansion provinces remain strategic plan until clients and sites go live.",
    });
  }
  if (draftPayroll > 0) {
    insights.push({
      id: "i-draft",
      tone: "warning",
      title: "Draft payroll remains open",
      body: `Current draft existing-client payroll is ${formatRupiah(draftPayroll)} and is excluded from historical completed totals.`,
    });
  }
  if (prospectCompletedPayroll === 0) {
    insights.push({
      id: "i-pros-zero",
      tone: "success",
      title: "No completed prospect payroll",
      body: "Prospect entities have zero CLOSED/VERIFIED/DISBURSED payroll periods — pipeline is cleanly separated from actuals.",
    });
  }

  // Geographic alerts from real data
  const alerts: ExecAlert[] = [];
  for (const c of filteredCompanies) {
    if (
      c.clientType === "EXISTING" &&
      (c.geo.status === "UNASSIGNED" || !c.geo.cityCode)
    ) {
      alerts.push({
        id: `loc-co-${c.id}`,
        type: "Client location not assigned",
        severity: "medium",
        entity: c.name,
        detail: "Existing client lacks city-level operational mapping.",
      });
    }
    if (c.clientType === "PROSPECT" && !c.geo.provinceCode) {
      alerts.push({
        id: `loc-pr-${c.id}`,
        type: "Prospect has no target province",
        severity: "low",
        entity: c.name,
        detail: "BD target province not yet recorded in operational mapping.",
      });
    }
  }
  for (const p of filteredProjects) {
    if (!p.geo.cityCode && p.company.clientType === "EXISTING") {
      alerts.push({
        id: `loc-pj-${p.id}`,
        type: "Project city not assigned",
        severity: "medium",
        entity: p.code,
        detail: "Project has no city/regency operational location.",
      });
    }
  }
  if (jk && jk.historicalPayroll >= historicalPayroll * 0.9 && historicalPayroll > 0) {
    alerts.push({
      id: "conc-jk",
      type: "Payroll concentration above threshold",
      severity: "medium",
      entity: "DKI Jakarta",
      detail: "≥90% of historical existing-client payroll is concentrated in one province.",
    });
  }
  if (pendingApprovals > 0) {
    alerts.push({
      id: "appr",
      type: "Pending approvals",
      severity: "high",
      entity: "Workflow",
      detail: `${pendingApprovals} approval step(s) pending (org-visible).`,
    });
  }

  const kpis: ExecKpi[] = [
    {
      id: "hist",
      label: "Historical Client Payroll",
      value: formatRupiah(histFiltered || historicalPayroll),
      delta: "CLOSED existing-client only",
      trend: "up",
      hint: "Sum of CLOSED totalNet for EXISTING clients",
      category: "primary",
    },
    {
      id: "draft",
      label: "Current Draft Payroll",
      value: formatRupiah(draftFiltered || draftPayroll),
      delta: "Not included in historical",
      trend: "neutral",
      hint: "DRAFT periods for EXISTING clients",
      category: "primary",
    },
    {
      id: "pipe",
      label: "Prospect Pipeline",
      value: formatRupiah(
        canViewSalesPipeline(scope.role)
          ? pipelineFiltered || pipeline
          : 0,
      ),
      delta: "Estimated payroll value",
      trend: "neutral",
      hint: "OPEN opportunities — not completed payroll",
      category: "primary",
    },
    {
      id: "ex-cli",
      label: "Existing Clients",
      value: String(existingInScope.length || existingClients.length),
      delta: "Active managed",
      trend: "neutral",
      hint: "clientType EXISTING + ACTIVE",
      category: "primary",
    },
    {
      id: "pr-cli",
      label: "Prospect Clients",
      value: String(prospectInScope.length || prospectClients.length),
      delta: "No completed payroll",
      trend: "neutral",
      hint: "clientType PROSPECT",
      category: "primary",
    },
    {
      id: "emp-cli",
      label: "Active Client Employees",
      value: String(activeClientEmployees),
      delta: "ACTIVE + PROBATION",
      trend: "neutral",
      hint: "Existing client headcount",
      category: "primary",
    },
    {
      id: "emp-int",
      label: "Internal Employees",
      value: String(internalEmpInScope || internalEmployees),
      delta: "Excluded from client KPIs",
      trend: "neutral",
      hint: "INTERNAL company headcount",
      category: "primary",
    },
    {
      id: "complete",
      label: "Payroll Completion",
      value: String(
        filteredPeriods.filter((p) => p.status === "CLOSED").length ||
          periodsGeo.filter((p) => p.status === "CLOSED").length,
      ),
      delta: "CLOSED periods",
      trend: "up",
      hint: "Count of closed payroll cycles in scope",
      category: "primary",
    },
    {
      id: "g-co",
      label: "Active Countries",
      value: String(activeCountries),
      delta: "Client-facing ops",
      trend: "neutral",
      hint: "Distinct countries with ACTIVE_OPERATION existing clients",
      category: "geographic",
    },
    {
      id: "g-pr",
      label: "Active Provinces",
      value: String(activeProvinces),
      delta: "With live clients",
      trend: "neutral",
      hint: "Provinces with mapped active existing clients",
      category: "geographic",
    },
    {
      id: "g-ci",
      label: "Active Cities",
      value: String(activeCities),
      delta: "City / regency",
      trend: "neutral",
      hint: "Cities with mapped active existing clients",
      category: "geographic",
    },
    {
      id: "g-si",
      label: "Active Sites",
      value: String(activeSites),
      delta: "Operational sites",
      trend: "neutral",
      hint: "Sites with mapped active existing clients",
      category: "geographic",
    },
  ];

  const breadcrumb = ["Indonesia"];
  if (effectiveFilters.province && effectiveFilters.province !== "ALL") {
    const p = ID_PROVINCES.find((x) => x.code === effectiveFilters.province);
    breadcrumb.push(p?.name ?? effectiveFilters.province);
  }
  if (effectiveFilters.city && effectiveFilters.city !== "ALL") {
    const cityName =
      cityDistribution.find((c) => c.code === effectiveFilters.city)?.name ??
      effectiveFilters.city;
    breadcrumb.push(cityName);
  }
  if (filters.projectId && filters.projectId !== "ALL") {
    const pr = projects.find((p) => p.id === filters.projectId);
    if (pr) breadcrumb.push(pr.code);
  }

  const durationMs = Math.round(performance.now() - t0);

  return {
    positioning: {
      title: "Global Payroll Command Center",
      subtitle:
        "Executive monitoring of payroll operations, workforce, clients, funding, and delivery across geographic operating areas.",
      context:
        "Indonesia is the primary operating market for the first three years, with architecture prepared for regional and multinational expansion.",
    },
    breadcrumb,
    filters: effectiveFilters,
    kpis,
    geographicSummary: {
      activeCountries,
      activeProvinces,
      activeCities,
      activeSites,
      unassignedClients,
    },
    provinceDistribution,
    cityDistribution,
    payrollTrend,
    workforceByProvince,
    portfolioByGeo,
    pipelineByGeo,
    workflowByStatus,
    recentCycles,
    insights,
    alerts,
    roadmap: [
      {
        year: 1,
        title: "Core Market Establishment",
        status: "Actual",
        focus: ["Jabodetabek", "DKI Jakarta", "Banten", "Jawa Barat"],
        capabilities: [
          "Existing client operations",
          "Payroll processing",
          "Employee management",
          "Approval",
          "Payment instruction",
          "Disbursement",
          "Reporting",
        ],
      },
      {
        year: 2,
        title: "Java Expansion",
        status: "Planned",
        focus: [
          "Jawa Tengah",
          "Jawa Timur",
          "Major industrial corridors",
          "Selected cities",
        ],
        capabilities: ["Strategic Plan — not active operation"],
      },
      {
        year: 3,
        title: "National Expansion",
        status: "Planned",
        focus: [
          "Sumatera",
          "Kalimantan",
          "Sulawesi",
          "Bali",
          "Industrial and outsourcing hubs",
        ],
        capabilities: ["Strategic Plan — not active operation"],
      },
    ],
    validation: {
      historicalPayroll,
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
      durationMs,
      geoSource: "controlled_operational_mapping",
    },
  };
}

/** Filter option lists for cascading UI (from live data + mapping). */
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
      select: { id: true, name: true, status: true, fundingModel: true },
      orderBy: { periodStart: "desc" },
      take: 24,
    }),
  ]);

  return {
    countries: [
      { value: "ID", label: "Indonesia" },
      { value: "ALL", label: "All countries (readiness)" },
    ],
    provinces: [
      { value: "ALL", label: "All provinces" },
      ...ID_PROVINCES.map((p) => ({ value: p.code, label: p.name })),
    ],
    cities: [
      { value: "ALL", label: "All cities / regencies" },
      // populated client-side from reference when province selected
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
      ...periods.map((p) => ({ value: p.id, label: p.name, status: p.status })),
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
    currencies: [
      { value: "IDR", label: "IDR" },
    ],
  };
}
