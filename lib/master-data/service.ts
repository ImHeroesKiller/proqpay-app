import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { Role } from "@/types";
import {
  computePeriodSchedule,
  effectiveRangesOverlap,
  parseCustomConfig,
  previewSchedules,
  rangesOverlap,
  validateEffectiveRange,
  type PayCycleFrequency,
} from "@/lib/master-data/pay-cycle";
import { recordMasterDataAudit } from "@/lib/master-data/audit";

export type Actor = {
  id: string;
  name: string;
  role: Role;
};

function asDate(v: string | Date): Date {
  if (v instanceof Date) return v;
  return new Date(v.includes("T") ? v : `${v}T00:00:00.000Z`);
}

// ── Clients (Company entityKind=CLIENT) ──────────────────

export async function listClients(opts: {
  organizationId?: string;
  q?: string;
  status?: string;
  take?: number;
  skip?: number;
}) {
  const where: Prisma.CompanyWhereInput = {
    entityKind: "CLIENT",
    ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
    ...(opts.status ? { lifecycleStatus: opts.status as never } : {}),
    ...(opts.q
      ? {
          OR: [
            { name: { contains: opts.q, mode: "insensitive" } },
            { legalName: { contains: opts.q, mode: "insensitive" } },
            { billingName: { contains: opts.q, mode: "insensitive" } },
            { npwp: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const take = Math.min(opts.take ?? 50, 100);
  const skip = opts.skip ?? 0;
  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { name: "asc" },
      take,
      skip,
      include: { billingProfile: true, _count: { select: { employees: true, projects: true } } },
    }),
    prisma.company.count({ where }),
  ]);
  return { items, total, take, skip };
}

export async function getClient(id: string) {
  return prisma.company.findFirst({
    where: { id, entityKind: "CLIENT" },
    include: {
      billingProfile: true,
      sites: { orderBy: { code: "asc" }, take: 50 },
      payrollGroups: { orderBy: { code: "asc" }, take: 50 },
      payCycles: { orderBy: { code: "asc" }, take: 50 },
      _count: { select: { employees: true, projects: true, payrollPeriods: true } },
    },
  });
}

export async function updateClient(
  id: string,
  data: {
    name?: string;
    legalName?: string | null;
    npwp?: string | null;
    address?: string | null;
    billingName?: string | null;
    billingAddress?: string | null;
    paymentTermsDays?: number | null;
    defaultCurrency?: string;
    billingContactName?: string | null;
    billingContactEmail?: string | null;
    billingContactPhone?: string | null;
    lifecycleStatus?: string;
    /** UI activate/deactivate may send status ACTIVE|INACTIVE → lifecycle */
    status?: string;
    industry?: string | null;
  },
  actor: Actor,
) {
  const before = await prisma.company.findUnique({ where: { id } });
  if (!before) throw new Error("Client not found");
  let lifecycleStatus = data.lifecycleStatus;
  if (!lifecycleStatus && data.status === "INACTIVE") lifecycleStatus = "INACTIVE";
  if (!lifecycleStatus && data.status === "ACTIVE") lifecycleStatus = "ACTIVE";
  const updated = await prisma.company.update({
    where: { id },
    data: {
      name: data.name,
      legalName: data.legalName,
      npwp: data.npwp,
      address: data.address,
      billingName: data.billingName,
      billingAddress: data.billingAddress,
      paymentTermsDays: data.paymentTermsDays,
      defaultCurrency: data.defaultCurrency,
      billingContactName: data.billingContactName,
      billingContactEmail: data.billingContactEmail,
      billingContactPhone: data.billingContactPhone,
      lifecycleStatus: lifecycleStatus as never,
      industry: data.industry,
    },
  });
  await recordMasterDataAudit({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    companyId: id,
    action: "UPDATE",
    entity: "Client",
    entityId: id,
    before: { name: before.name, lifecycleStatus: before.lifecycleStatus },
    after: { name: updated.name, lifecycleStatus: updated.lifecycleStatus },
  });
  return updated;
}

export async function createClient(
  data: {
    organizationId: string;
    name: string;
    legalName?: string;
    npwp?: string;
    billingName?: string;
    defaultCurrency?: string;
    paymentTermsDays?: number;
  },
  actor: Actor,
) {
  const created = await prisma.company.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      legalName: data.legalName,
      npwp: data.npwp,
      entityKind: "CLIENT",
      billingName: data.billingName ?? data.name,
      defaultCurrency: data.defaultCurrency ?? "IDR",
      paymentTermsDays: data.paymentTermsDays ?? 30,
      lifecycleStatus: "ACTIVE",
    },
  });
  await recordMasterDataAudit({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    companyId: created.id,
    action: "CREATE",
    entity: "Client",
    entityId: created.id,
    after: { name: created.name },
  });
  return created;
}

// ── Sites ────────────────────────────────────────────────

export async function listSites(opts: {
  companyId?: string;
  projectId?: string;
  q?: string;
  status?: "ACTIVE" | "INACTIVE";
  take?: number;
  skip?: number;
}) {
  const where: Prisma.SiteWhereInput = {
    ...(opts.companyId ? { companyId: opts.companyId } : {}),
    ...(opts.projectId ? { projectId: opts.projectId } : {}),
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.q
      ? {
          OR: [
            { code: { contains: opts.q, mode: "insensitive" } },
            { name: { contains: opts.q, mode: "insensitive" } },
            { city: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const take = Math.min(opts.take ?? 50, 100);
  const skip = opts.skip ?? 0;
  const [items, total] = await Promise.all([
    prisma.site.findMany({
      where,
      orderBy: [{ companyId: "asc" }, { code: "asc" }],
      take,
      skip,
      include: {
        company: { select: { id: true, name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
    }),
    prisma.site.count({ where }),
  ]);
  return { items, total, take, skip };
}

export async function createSite(
  data: {
    companyId: string;
    projectId?: string | null;
    code: string;
    name: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    timezone?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
  },
  actor: Actor,
) {
  if (data.projectId) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project || project.companyId !== data.companyId) {
      throw new Error("Site project must belong to the same client company");
    }
  }
  const from = data.effectiveFrom ? asDate(data.effectiveFrom) : new Date();
  const to = data.effectiveTo ? asDate(data.effectiveTo) : null;
  const rangeErr = validateEffectiveRange(from, to);
  if (rangeErr) throw new Error(rangeErr);

  try {
    const site = await prisma.site.create({
      data: {
        companyId: data.companyId,
        projectId: data.projectId ?? null,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        address: data.address,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        timezone: data.timezone ?? "Asia/Jakarta",
        effectiveFrom: from,
        effectiveTo: to,
      },
    });
    await recordMasterDataAudit({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      companyId: data.companyId,
      action: "CREATE",
      entity: "Site",
      entityId: site.id,
      after: { code: site.code, name: site.name },
    });
    return site;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      throw new Error("Site code already exists for this company");
    }
    throw e;
  }
}

export async function updateSite(
  id: string,
  data: Partial<{
    name: string;
    projectId: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    timezone: string;
    status: "ACTIVE" | "INACTIVE";
    effectiveFrom: string;
    effectiveTo: string | null;
  }>,
  actor: Actor,
) {
  const before = await prisma.site.findUnique({ where: { id } });
  if (!before) throw new Error("Site not found");
  if (data.projectId) {
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project || project.companyId !== before.companyId) {
      throw new Error("Site project must belong to the same client company");
    }
  }
  if (data.status === "INACTIVE") {
    const open = await prisma.payrollPeriod.count({
      where: {
        payrollGroup: { siteId: id },
        status: { notIn: ["CLOSED", "LOCKED", "DISBURSED", "VERIFIED"] },
      },
    });
    if (open > 0) {
      throw new Error(
        `Cannot deactivate site: ${open} open payroll period(s) still reference groups on this site`,
      );
    }
  }
  const updated = await prisma.site.update({
    where: { id },
    data: {
      name: data.name,
      projectId: data.projectId,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      timezone: data.timezone,
      status: data.status,
      effectiveFrom: data.effectiveFrom ? asDate(data.effectiveFrom) : undefined,
      effectiveTo:
        data.effectiveTo === undefined
          ? undefined
          : data.effectiveTo
            ? asDate(data.effectiveTo)
            : null,
    },
  });
  await recordMasterDataAudit({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    companyId: before.companyId,
    action: "UPDATE",
    entity: "Site",
    entityId: id,
    before: { status: before.status, name: before.name },
    after: { status: updated.status, name: updated.name },
  });
  return updated;
}

// ── Pay cycles ───────────────────────────────────────────

export async function listPayCycles(opts: {
  companyId?: string;
  q?: string;
  status?: "ACTIVE" | "INACTIVE";
  take?: number;
  skip?: number;
}) {
  const where: Prisma.PayCycleWhereInput = {
    ...(opts.companyId ? { companyId: opts.companyId } : {}),
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.q
      ? {
          OR: [
            { code: { contains: opts.q, mode: "insensitive" } },
            { name: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const take = Math.min(opts.take ?? 50, 100);
  const skip = opts.skip ?? 0;
  const [items, total] = await Promise.all([
    prisma.payCycle.findMany({
      where,
      orderBy: [{ companyId: "asc" }, { code: "asc" }],
      take,
      skip,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { payrollGroups: true } },
      },
    }),
    prisma.payCycle.count({ where }),
  ]);
  return { items, total, take, skip };
}

export async function createPayCycle(
  data: {
    companyId: string;
    code: string;
    name: string;
    frequency: PayCycleFrequency;
    periodDefinition?: string;
    cutoffDay?: number;
    paymentDay?: number;
    approvalLagDays?: number;
    timezone?: string;
    customConfig?: string | null;
  },
  actor: Actor,
) {
  if (data.frequency === "CUSTOM") {
    const parsed = parseCustomConfig(data.customConfig);
    if (!parsed.ok) throw new Error(parsed.error);
  }
  const cutoffDay = data.cutoffDay ?? 25;
  const paymentDay = data.paymentDay ?? 28;
  if (cutoffDay < 1 || cutoffDay > 31 || paymentDay < 1 || paymentDay > 31) {
    throw new Error("cutoffDay and paymentDay must be between 1 and 31");
  }
  try {
    const cycle = await prisma.payCycle.create({
      data: {
        companyId: data.companyId,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        frequency: data.frequency,
        periodDefinition: data.periodDefinition ?? "calendar_month",
        cutoffDay,
        paymentDay,
        approvalLagDays: data.approvalLagDays ?? 2,
        timezone: data.timezone ?? "Asia/Jakarta",
        customConfig: data.customConfig ?? null,
      },
    });
    await recordMasterDataAudit({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      companyId: data.companyId,
      action: "CREATE",
      entity: "PayCycle",
      entityId: cycle.id,
      after: { code: cycle.code, frequency: cycle.frequency },
    });
    return cycle;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      throw new Error("Pay cycle code already exists for this company");
    }
    throw e;
  }
}

export async function updatePayCycle(
  id: string,
  data: Partial<{
    name: string;
    frequency: PayCycleFrequency;
    periodDefinition: string;
    cutoffDay: number;
    paymentDay: number;
    approvalLagDays: number;
    timezone: string;
    customConfig: string | null;
    status: "ACTIVE" | "INACTIVE";
  }>,
  actor: Actor,
) {
  const before = await prisma.payCycle.findUnique({ where: { id } });
  if (!before) throw new Error("Pay cycle not found");
  if (data.frequency === "CUSTOM" || (before.frequency === "CUSTOM" && data.customConfig !== undefined)) {
    const parsed = parseCustomConfig(data.customConfig ?? before.customConfig);
    if (!parsed.ok) throw new Error(parsed.error);
  }
  if (data.status === "INACTIVE") {
    const open = await prisma.payrollPeriod.count({
      where: {
        payCycleId: id,
        status: { notIn: ["CLOSED", "LOCKED", "DISBURSED", "VERIFIED"] },
      },
    });
    if (open > 0) {
      throw new Error(`Cannot deactivate pay cycle: ${open} open payroll period(s)`);
    }
  }
  const updated = await prisma.payCycle.update({
    where: { id },
    data: {
      name: data.name,
      frequency: data.frequency,
      periodDefinition: data.periodDefinition,
      cutoffDay: data.cutoffDay,
      paymentDay: data.paymentDay,
      approvalLagDays: data.approvalLagDays,
      timezone: data.timezone,
      customConfig: data.customConfig,
      status: data.status,
    },
  });
  await recordMasterDataAudit({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    companyId: before.companyId,
    action: "UPDATE",
    entity: "PayCycle",
    entityId: id,
    before: { status: before.status, name: before.name },
    after: { status: updated.status, name: updated.name },
  });
  return updated;
}

export function schedulePreviewForCycle(cycle: {
  frequency: PayCycleFrequency;
  cutoffDay: number;
  paymentDay: number;
  approvalLagDays: number;
  customConfig: string | null;
}, count = 3) {
  return previewSchedules(
    {
      frequency: cycle.frequency,
      cutoffDay: cycle.cutoffDay,
      paymentDay: cycle.paymentDay,
      approvalLagDays: cycle.approvalLagDays,
      customConfig: cycle.customConfig,
    },
    count,
  );
}

// ── Payroll groups ───────────────────────────────────────

export async function listPayrollGroups(opts: {
  companyId?: string;
  q?: string;
  status?: "ACTIVE" | "INACTIVE";
  take?: number;
  skip?: number;
}) {
  const where: Prisma.PayrollGroupWhereInput = {
    ...(opts.companyId ? { companyId: opts.companyId } : {}),
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.q
      ? {
          OR: [
            { code: { contains: opts.q, mode: "insensitive" } },
            { name: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const take = Math.min(opts.take ?? 50, 100);
  const skip = opts.skip ?? 0;
  const [items, total] = await Promise.all([
    prisma.payrollGroup.findMany({
      where,
      orderBy: [{ companyId: "asc" }, { code: "asc" }],
      take,
      skip,
      include: {
        company: { select: { id: true, name: true } },
        payCycle: true,
        project: { select: { id: true, code: true, name: true } },
        site: { select: { id: true, code: true, name: true } },
        _count: { select: { assignments: true, payrollPeriods: true } },
      },
    }),
    prisma.payrollGroup.count({ where }),
  ]);
  return { items, total, take, skip };
}

export async function getPayrollGroup(id: string) {
  return prisma.payrollGroup.findUnique({
    where: { id },
    include: {
      company: true,
      payCycle: true,
      project: true,
      site: true,
      assignments: {
        where: { status: "ACTIVE", effectiveTo: null },
        take: 100,
        include: {
          employee: {
            select: { id: true, employeeCode: true, name: true, status: true },
          },
        },
        orderBy: { effectiveFrom: "desc" },
      },
      payrollPeriods: {
        orderBy: { periodStart: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          periodStart: true,
          periodEnd: true,
          status: true,
          employeeCount: true,
        },
      },
      _count: { select: { assignments: true, payrollPeriods: true } },
    },
  });
}

export async function createPayrollGroup(
  data: {
    companyId: string;
    payCycleId: string;
    projectId?: string | null;
    siteId?: string | null;
    code: string;
    name: string;
    currency?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
    cutoffPolicy?: string;
    paymentPolicy?: string;
  },
  actor: Actor,
) {
  const cycle = await prisma.payCycle.findUnique({ where: { id: data.payCycleId } });
  if (!cycle || cycle.companyId !== data.companyId) {
    throw new Error("Pay cycle must belong to the same company");
  }
  if (cycle.status !== "ACTIVE") throw new Error("Pay cycle must be ACTIVE");
  if (data.projectId) {
    const p = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!p || p.companyId !== data.companyId) {
      throw new Error("Project must belong to the same company");
    }
  }
  if (data.siteId) {
    const s = await prisma.site.findUnique({ where: { id: data.siteId } });
    if (!s || s.companyId !== data.companyId) {
      throw new Error("Site must belong to the same company");
    }
    if (data.projectId && s.projectId && s.projectId !== data.projectId) {
      throw new Error("Site is not in the selected project scope");
    }
  }
  const from = data.effectiveFrom ? asDate(data.effectiveFrom) : new Date();
  const to = data.effectiveTo ? asDate(data.effectiveTo) : null;
  const rangeErr = validateEffectiveRange(from, to);
  if (rangeErr) throw new Error(rangeErr);

  try {
    const group = await prisma.payrollGroup.create({
      data: {
        companyId: data.companyId,
        payCycleId: data.payCycleId,
        projectId: data.projectId ?? null,
        siteId: data.siteId ?? null,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        currency: data.currency ?? "IDR",
        effectiveFrom: from,
        effectiveTo: to,
        cutoffPolicy: data.cutoffPolicy,
        paymentPolicy: data.paymentPolicy,
      },
    });
    await recordMasterDataAudit({
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      companyId: data.companyId,
      action: "CREATE",
      entity: "PayrollGroup",
      entityId: group.id,
      after: { code: group.code, payCycleId: group.payCycleId },
    });
    return group;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      throw new Error("Payroll group code already exists for this company");
    }
    throw e;
  }
}

export async function updatePayrollGroup(
  id: string,
  data: Partial<{
    name: string;
    projectId: string | null;
    siteId: string | null;
    payCycleId: string;
    currency: string;
    status: "ACTIVE" | "INACTIVE";
    effectiveFrom: string;
    effectiveTo: string | null;
    cutoffPolicy: string | null;
    paymentPolicy: string | null;
  }>,
  actor: Actor,
) {
  const before = await prisma.payrollGroup.findUnique({ where: { id } });
  if (!before) throw new Error("Payroll group not found");
  if (data.payCycleId) {
    const cycle = await prisma.payCycle.findUnique({ where: { id: data.payCycleId } });
    if (!cycle || cycle.companyId !== before.companyId) {
      throw new Error("Pay cycle must belong to the same company");
    }
  }
  if (data.status === "INACTIVE") {
    const open = await prisma.payrollPeriod.count({
      where: {
        payrollGroupId: id,
        status: { notIn: ["CLOSED", "LOCKED", "DISBURSED", "VERIFIED"] },
      },
    });
    if (open > 0) {
      throw new Error(`Cannot deactivate group: ${open} open payroll period(s)`);
    }
  }
  const updated = await prisma.payrollGroup.update({
    where: { id },
    data: {
      name: data.name,
      projectId: data.projectId,
      siteId: data.siteId,
      payCycleId: data.payCycleId,
      currency: data.currency,
      status: data.status,
      effectiveFrom: data.effectiveFrom ? asDate(data.effectiveFrom) : undefined,
      effectiveTo:
        data.effectiveTo === undefined
          ? undefined
          : data.effectiveTo
            ? asDate(data.effectiveTo)
            : null,
      cutoffPolicy: data.cutoffPolicy,
      paymentPolicy: data.paymentPolicy,
    },
  });
  await recordMasterDataAudit({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    companyId: before.companyId,
    action: "UPDATE",
    entity: "PayrollGroup",
    entityId: id,
    before: { status: before.status, name: before.name },
    after: { status: updated.status, name: updated.name },
  });
  return updated;
}

export async function countActivePopulation(
  payrollGroupId: string,
  asOf: Date = new Date(),
) {
  return prisma.employeePayrollAssignment.count({
    where: {
      payrollGroupId,
      status: "ACTIVE",
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      employee: { status: { in: ["ACTIVE", "PROBATION"] } },
    },
  });
}

export async function assignEmployee(
  data: {
    employeeId: string;
    payrollGroupId: string;
    projectId?: string | null;
    siteId?: string | null;
    positionId?: string | null;
    costCenterId?: string | null;
    effectiveFrom: string;
    effectiveTo?: string | null;
  },
  actor: Actor,
) {
  const group = await prisma.payrollGroup.findUnique({ where: { id: data.payrollGroupId } });
  if (!group) throw new Error("Payroll group not found");
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!employee || employee.companyId !== group.companyId) {
    throw new Error("Employee must belong to the same company as the payroll group");
  }
  const from = asDate(data.effectiveFrom);
  const to = data.effectiveTo ? asDate(data.effectiveTo) : null;
  const rangeErr = validateEffectiveRange(from, to);
  if (rangeErr) throw new Error(rangeErr);

  const existing = await prisma.employeePayrollAssignment.findMany({
    where: {
      employeeId: data.employeeId,
      status: "ACTIVE",
    },
  });
  for (const ex of existing) {
    if (
      effectiveRangesOverlap(
        from,
        to,
        ex.effectiveFrom,
        ex.effectiveTo,
      )
    ) {
      throw new Error(
        "Overlapping active assignment for this employee — end the previous assignment first",
      );
    }
  }

  const assignment = await prisma.employeePayrollAssignment.create({
    data: {
      employeeId: data.employeeId,
      payrollGroupId: data.payrollGroupId,
      projectId: data.projectId ?? group.projectId,
      siteId: data.siteId ?? group.siteId,
      positionId: data.positionId ?? employee.positionId,
      costCenterId: data.costCenterId ?? employee.costCenterId,
      effectiveFrom: from,
      effectiveTo: to,
      status: "ACTIVE",
    },
  });
  await recordMasterDataAudit({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    companyId: group.companyId,
    action: "CREATE",
    entity: "EmployeePayrollAssignment",
    entityId: assignment.id,
    after: {
      employeeId: data.employeeId,
      payrollGroupId: data.payrollGroupId,
      effectiveFrom: data.effectiveFrom,
    },
  });
  return assignment;
}

// ── Payroll periods from group ───────────────────────────

export async function createPayrollPeriodFromGroup(
  data: {
    payrollGroupId: string;
    name?: string;
    /** Override dates (authorized) */
    periodStart?: string;
    periodEnd?: string;
    cutoffAt?: string;
    approvalDueAt?: string;
    paymentDueAt?: string;
    allowEmptyPopulation?: boolean;
  },
  actor: Actor,
  opts?: { allowDateOverride?: boolean },
) {
  const group = await prisma.payrollGroup.findUnique({
    where: { id: data.payrollGroupId },
    include: { payCycle: true, company: true },
  });
  if (!group) throw new Error("Payroll group not found");
  if (group.status !== "ACTIVE") throw new Error("Payroll group is inactive");
  if (group.payCycle.status !== "ACTIVE") throw new Error("Pay cycle is inactive");

  const schedule = computePeriodSchedule({
    frequency: group.payCycle.frequency,
    cutoffDay: group.payCycle.cutoffDay,
    paymentDay: group.payCycle.paymentDay,
    approvalLagDays: group.payCycle.approvalLagDays,
    customConfig: group.payCycle.customConfig,
  });

  let periodStart = schedule.periodStart;
  let periodEnd = schedule.periodEnd;
  let cutoffAt = schedule.cutoffAt;
  let approvalDueAt = schedule.approvalDueAt;
  let paymentDueAt = schedule.paymentDueAt;

  if (
    opts?.allowDateOverride &&
    (data.periodStart || data.periodEnd || data.paymentDueAt)
  ) {
    if (data.periodStart) periodStart = asDate(data.periodStart);
    if (data.periodEnd) periodEnd = asDate(data.periodEnd);
    if (data.cutoffAt) cutoffAt = new Date(data.cutoffAt);
    if (data.approvalDueAt) approvalDueAt = new Date(data.approvalDueAt);
    if (data.paymentDueAt) paymentDueAt = asDate(data.paymentDueAt);
  }

  if (periodEnd < periodStart) throw new Error("periodEnd must be ≥ periodStart");

  const overlaps = await prisma.payrollPeriod.findMany({
    where: {
      payrollGroupId: group.id,
      status: { notIn: ["REJECTED"] },
    },
    select: { id: true, name: true, periodStart: true, periodEnd: true },
  });
  for (const o of overlaps) {
    if (rangesOverlap(periodStart, periodEnd, o.periodStart, o.periodEnd)) {
      throw new Error(
        `Overlapping period with "${o.name}" (${o.periodStart.toISOString().slice(0, 10)} – ${o.periodEnd.toISOString().slice(0, 10)})`,
      );
    }
  }

  const population = await countActivePopulation(group.id, periodEnd);
  if (population === 0 && !data.allowEmptyPopulation) {
    throw new Error(
      "Employee population is empty for this payroll group — assign employees or set allowEmptyPopulation",
    );
  }

  const name =
    data.name?.trim() ||
    `${group.code} ${periodStart.toISOString().slice(0, 7)}`;

  const period = await prisma.payrollPeriod.create({
    data: {
      companyId: group.companyId,
      name,
      periodStart,
      periodEnd,
      payDate: paymentDueAt,
      paymentDueAt,
      cutoffAt,
      approvalDueAt,
      payrollGroupId: group.id,
      payCycleId: group.payCycleId,
      projectId: group.projectId,
      employeeCount: population,
      fundingModel: group.company.defaultFundingModel,
    },
  });

  await recordMasterDataAudit({
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    companyId: group.companyId,
    action: "CREATE",
    entity: "PayrollPeriod",
    entityId: period.id,
    after: {
      name: period.name,
      payrollGroupId: group.id,
      payCycleId: group.payCycleId,
      population,
    },
  });

  return {
    period,
    population,
    warnings: population === 0 ? ["Empty employee population"] : [],
  };
}

export async function previewPeriodFromGroup(payrollGroupId: string) {
  const group = await prisma.payrollGroup.findUnique({
    where: { id: payrollGroupId },
    include: { payCycle: true, company: { select: { id: true, name: true } } },
  });
  if (!group) throw new Error("Payroll group not found");
  const schedule = computePeriodSchedule({
    frequency: group.payCycle.frequency,
    cutoffDay: group.payCycle.cutoffDay,
    paymentDay: group.payCycle.paymentDay,
    approvalLagDays: group.payCycle.approvalLagDays,
    customConfig: group.payCycle.customConfig,
  });
  const population = await countActivePopulation(group.id, schedule.periodEnd);
  const warnings: string[] = [];
  if (group.status !== "ACTIVE") warnings.push("Payroll group is inactive");
  if (group.payCycle.status !== "ACTIVE") warnings.push("Pay cycle is inactive");
  if (population === 0) warnings.push("Employee population is empty");
  return { group, schedule, population, warnings };
}
