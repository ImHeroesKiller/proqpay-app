/**
 * Tax & BPJS configuration management (Increment 1.5).
 * Active configs are immutable — new versions only.
 */

import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { assertCompanyAccess } from "@/lib/auth/scope";

const DEFAULT_PTKP = {
  "TK/0": 54_000_000,
  "TK/1": 58_500_000,
  "TK/2": 63_000_000,
  "TK/3": 67_500_000,
  "K/0": 58_500_000,
  "K/1": 63_000_000,
  "K/2": 67_500_000,
  "K/3": 72_000_000,
};

export async function listTaxConfigs(companyId: string) {
  return prisma.taxConfig.findMany({
    where: { companyId },
    orderBy: [{ version: "desc" }, { effectiveFrom: "desc" }],
  });
}

export async function listBpjsConfigs(companyId: string) {
  return prisma.bpjsConfig.findMany({
    where: { companyId },
    orderBy: [{ version: "desc" }, { effectiveFrom: "desc" }],
  });
}

export async function getActiveTax(companyId: string) {
  return prisma.taxConfig.findFirst({
    where: { companyId, isActive: true, lifecycle: "ACTIVE" },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function getActiveBpjs(companyId: string) {
  return prisma.bpjsConfig.findFirst({
    where: { companyId, isActive: true, lifecycle: "ACTIVE" },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function createTaxConfigVersion(
  scope: SessionScope,
  input: {
    companyId: string;
    name: string;
    method?: string;
    defaultTerRate: number;
    nonNpwpSurcharge?: number;
    effectiveFrom: string;
    ptkpJson?: string | null;
    rulesJson?: string | null;
    changeNote?: string | null;
    activate?: boolean;
  },
) {
  if (!assertCompanyAccess(scope, input.companyId)) {
    throw new Error("Cross-company access denied");
  }
  if (input.defaultTerRate < 0 || input.defaultTerRate > 1) {
    throw new Error("defaultTerRate must be between 0 and 1");
  }
  if (input.ptkpJson) {
    try {
      JSON.parse(input.ptkpJson);
    } catch {
      throw new Error("ptkpJson must be valid JSON");
    }
  }

  const last = await prisma.taxConfig.findFirst({
    where: { companyId: input.companyId },
    orderBy: { version: "desc" },
  });
  const version = (last?.version ?? 0) + 1;
  const activate = input.activate !== false;

  if (activate) {
    await prisma.taxConfig.updateMany({
      where: { companyId: input.companyId, isActive: true },
      data: {
        isActive: false,
        lifecycle: "DEPRECATED",
        effectiveTo: new Date(input.effectiveFrom),
      },
    });
  }

  return prisma.taxConfig.create({
    data: {
      companyId: input.companyId,
      name: input.name,
      method: input.method ?? "TER",
      defaultTerRate: input.defaultTerRate,
      nonNpwpSurcharge: input.nonNpwpSurcharge ?? 0.2,
      effectiveFrom: new Date(input.effectiveFrom),
      version,
      lifecycle: activate ? "ACTIVE" : "DRAFT",
      isActive: activate,
      ptkpJson: input.ptkpJson ?? JSON.stringify(DEFAULT_PTKP),
      rulesJson: input.rulesJson ?? null,
      changeNote: input.changeNote ?? null,
      createdById: scope.userId,
    },
  });
}

export async function createBpjsConfigVersion(
  scope: SessionScope,
  input: {
    companyId: string;
    name: string;
    effectiveFrom: string;
    kesehatanEmployee: number;
    kesehatanEmployer: number;
    jhtEmployee: number;
    jhtEmployer: number;
    jkkEmployer: number;
    jkmEmployer: number;
    jpEmployee: number;
    jpEmployer: number;
    maxWageKesehatan: number;
    maxWageJp: number;
    changeNote?: string | null;
    activate?: boolean;
  },
) {
  if (!assertCompanyAccess(scope, input.companyId)) {
    throw new Error("Cross-company access denied");
  }
  const rates = [
    input.kesehatanEmployee,
    input.kesehatanEmployer,
    input.jhtEmployee,
    input.jhtEmployer,
    input.jkkEmployer,
    input.jkmEmployer,
    input.jpEmployee,
    input.jpEmployer,
  ];
  if (rates.some((r) => r < 0 || r > 1)) {
    throw new Error("BPJS rates must be between 0 and 1");
  }

  const last = await prisma.bpjsConfig.findFirst({
    where: { companyId: input.companyId },
    orderBy: { version: "desc" },
  });
  const version = (last?.version ?? 0) + 1;
  const activate = input.activate !== false;

  if (activate) {
    await prisma.bpjsConfig.updateMany({
      where: { companyId: input.companyId, isActive: true },
      data: {
        isActive: false,
        lifecycle: "DEPRECATED",
        effectiveTo: new Date(input.effectiveFrom),
      },
    });
  }

  return prisma.bpjsConfig.create({
    data: {
      companyId: input.companyId,
      name: input.name,
      effectiveFrom: new Date(input.effectiveFrom),
      kesehatanEmployee: input.kesehatanEmployee,
      kesehatanEmployer: input.kesehatanEmployer,
      jhtEmployee: input.jhtEmployee,
      jhtEmployer: input.jhtEmployer,
      jkkEmployer: input.jkkEmployer,
      jkmEmployer: input.jkmEmployer,
      jpEmployee: input.jpEmployee,
      jpEmployer: input.jpEmployer,
      maxWageKesehatan: input.maxWageKesehatan,
      maxWageJp: input.maxWageJp,
      version,
      lifecycle: activate ? "ACTIVE" : "DRAFT",
      isActive: activate,
      changeNote: input.changeNote ?? null,
      createdById: scope.userId,
    },
  });
}

export async function activateTaxConfig(scope: SessionScope, id: string) {
  const row = await prisma.taxConfig.findUnique({ where: { id } });
  if (!row) throw new Error("Tax config not found");
  if (!assertCompanyAccess(scope, row.companyId)) {
    throw new Error("Cross-company access denied");
  }
  await prisma.taxConfig.updateMany({
    where: { companyId: row.companyId, isActive: true },
    data: { isActive: false, lifecycle: "DEPRECATED" },
  });
  return prisma.taxConfig.update({
    where: { id },
    data: { isActive: true, lifecycle: "ACTIVE", effectiveTo: null },
  });
}

export async function activateBpjsConfig(scope: SessionScope, id: string) {
  const row = await prisma.bpjsConfig.findUnique({ where: { id } });
  if (!row) throw new Error("BPJS config not found");
  if (!assertCompanyAccess(scope, row.companyId)) {
    throw new Error("Cross-company access denied");
  }
  await prisma.bpjsConfig.updateMany({
    where: { companyId: row.companyId, isActive: true },
    data: { isActive: false, lifecycle: "DEPRECATED" },
  });
  return prisma.bpjsConfig.update({
    where: { id },
    data: { isActive: true, lifecycle: "ACTIVE", effectiveTo: null },
  });
}

export { DEFAULT_PTKP };
