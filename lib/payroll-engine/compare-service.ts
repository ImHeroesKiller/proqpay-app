/**
 * Calculation comparison Run A vs Run B (Increment 1.5).
 */

import { prisma } from "@/lib/db";

function num(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

const KEYS = [
  "BasicSalary",
  "TransportAllowance",
  "MealAllowance",
  "Overtime",
  "Bonus",
  "Gross",
  "Loan",
  "BPJSEmployee",
  "BPJSEmployer",
  "PPH21",
  "NetSalary",
] as const;

export async function compareCalculations(
  calculationIdA: string,
  calculationIdB: string,
) {
  const [a, b] = await Promise.all([
    prisma.payrollCalculation.findUnique({
      where: { id: calculationIdA },
      include: { items: true, journal: true },
    }),
    prisma.payrollCalculation.findUnique({
      where: { id: calculationIdB },
      include: { items: true, journal: true },
    }),
  ]);
  if (!a || !b) throw new Error("One or both calculations not found");
  if (a.companyId !== b.companyId) {
    throw new Error("Calculations must belong to the same company");
  }

  type Item = {
    employeeId: string | null;
    employeeName: string;
    employeeCode: string | null;
    componentCode: string;
    finalValue: { toString(): string } | number;
  };

  function byEmp(
    items: Item[],
  ): Map<string, { name: string; code: string | null; values: Record<string, number> }> {
    const m = new Map<
      string,
      { name: string; code: string | null; values: Record<string, number> }
    >();
    for (const it of items) {
      const id = it.employeeId ?? it.employeeName;
      const cur = m.get(id) ?? {
        name: it.employeeName,
        code: it.employeeCode,
        values: {},
      };
      cur.values[it.componentCode] = num(it.finalValue);
      m.set(id, cur);
    }
    return m;
  }

  const mapA = byEmp(a.items as Item[]);
  const mapB = byEmp(b.items as Item[]);
  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

  const employees = [...allIds].map((id) => {
    const ea = mapA.get(id);
    const eb = mapB.get(id);
    const deltas: Record<
      string,
      { a: number; b: number; delta: number; changed: boolean }
    > = {};
    for (const k of KEYS) {
      const va = ea?.values[k] ?? 0;
      const vb = eb?.values[k] ?? 0;
      const delta = vb - va;
      deltas[k] = {
        a: va,
        b: vb,
        delta,
        changed: Math.abs(delta) > 0.009,
      };
    }
    return {
      employeeId: id,
      employeeName: ea?.name ?? eb?.name ?? id,
      employeeCode: ea?.code ?? eb?.code,
      onlyInA: Boolean(ea && !eb),
      onlyInB: Boolean(eb && !ea),
      deltas,
      netChanged: deltas.NetSalary?.changed ?? false,
    };
  });

  employees.sort((x, y) => x.employeeName.localeCompare(y.employeeName));

  return {
    runA: {
      id: a.id,
      runNumber: a.runNumber,
      revision: a.revision,
      status: a.status,
      calculatedAt: a.calculatedAt,
      grossTotal: num(a.grossTotal),
      netTotal: num(a.netTotal),
      taxConfigId: a.taxConfigId,
      bpjsConfigId: a.bpjsConfigId,
      runReason: a.runReason,
      formulaVersionIds: a.formulaVersionIds,
    },
    runB: {
      id: b.id,
      runNumber: b.runNumber,
      revision: b.revision,
      status: b.status,
      calculatedAt: b.calculatedAt,
      grossTotal: num(b.grossTotal),
      netTotal: num(b.netTotal),
      taxConfigId: b.taxConfigId,
      bpjsConfigId: b.bpjsConfigId,
      runReason: b.runReason,
      formulaVersionIds: b.formulaVersionIds,
    },
    totals: {
      grossDelta: num(b.grossTotal) - num(a.grossTotal),
      netDelta: num(b.netTotal) - num(a.netTotal),
      employeeCountA: a.employeeCount,
      employeeCountB: b.employeeCount,
      changedEmployees: employees.filter((e) => e.netChanged).length,
    },
    employees,
  };
}

export async function listPeriodCalculations(payrollPeriodId: string) {
  return prisma.payrollCalculation.findMany({
    where: { payrollPeriodId },
    orderBy: [{ runNumber: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      runNumber: true,
      revision: true,
      status: true,
      grossTotal: true,
      netTotal: true,
      employeeCount: true,
      calculatedAt: true,
      runReason: true,
      taxConfigId: true,
      bpjsConfigId: true,
      formulaVersionIds: true,
      createdById: true,
      parentCalculationId: true,
      createdAt: true,
    },
  });
}
