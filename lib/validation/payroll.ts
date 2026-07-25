import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export type ValidationIssueInput = {
  payrollPeriodId: string;
  payrollLineId?: string | null;
  employeeId?: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  code: string;
  message: string;
};

export async function runPayrollValidation(periodId: string) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: {
      lines: { include: { employee: true } },
    },
  });
  if (!period) throw new Error("Periode tidak ditemukan");

  const issues: ValidationIssueInput[] = [];

  if (!period.lines.length) {
    issues.push({
      payrollPeriodId: periodId,
      severity: "CRITICAL",
      code: "NO_LINES",
      message: "Belum ada baris payroll. Jalankan kalkulasi terlebih dahulu.",
    });
  }

  for (const line of period.lines) {
    const net = Number(line.netPay);
    const gross = Number(line.grossPay ?? line.baseSalary);
    const emp = line.employee;

    if (net < 0) {
      issues.push({
        payrollPeriodId: periodId,
        payrollLineId: line.id,
        employeeId: line.employeeId,
        severity: "CRITICAL",
        code: "NET_NEGATIVE",
        message: `${line.employeeName}: net pay negatif`,
      });
    }
    if (net === 0 && gross > 0) {
      issues.push({
        payrollPeriodId: periodId,
        payrollLineId: line.id,
        employeeId: line.employeeId,
        severity: "WARNING",
        code: "NET_ZERO",
        message: `${line.employeeName}: net pay nol`,
      });
    }
    if (!emp.bankAccount || emp.bankAccount === "-") {
      issues.push({
        payrollPeriodId: periodId,
        payrollLineId: line.id,
        employeeId: line.employeeId,
        severity: "CRITICAL",
        code: "BANK_MISSING",
        message: `${line.employeeName}: rekening bank belum lengkap`,
      });
    }
    if (!emp.npwp || emp.npwp === "-") {
      issues.push({
        payrollPeriodId: periodId,
        payrollLineId: line.id,
        employeeId: line.employeeId,
        severity: "WARNING",
        code: "NPWP_MISSING",
        message: `${line.employeeName}: NPWP belum diisi`,
      });
    }
    if (!emp.bpjsNumber || emp.bpjsNumber === "-") {
      issues.push({
        payrollPeriodId: periodId,
        payrollLineId: line.id,
        employeeId: line.employeeId,
        severity: "WARNING",
        code: "BPJS_MISSING",
        message: `${line.employeeName}: nomor BPJS belum lengkap`,
      });
    }
    if (Number(line.baseSalary) <= 0) {
      issues.push({
        payrollPeriodId: periodId,
        payrollLineId: line.id,
        employeeId: line.employeeId,
        severity: "CRITICAL",
        code: "SALARY_ZERO",
        message: `${line.employeeName}: gaji pokok tidak valid`,
      });
    }
    // Variance vs base: net far from 70-100% of base may be anomaly
    const base = Number(line.baseSalary);
    if (base > 0 && net > 0 && (net < base * 0.4 || net > base * 1.5)) {
      issues.push({
        payrollPeriodId: periodId,
        payrollLineId: line.id,
        employeeId: line.employeeId,
        severity: "WARNING",
        code: "NET_VARIANCE",
        message: `${line.employeeName}: net pay menyimpang signifikan dari gaji pokok`,
      });
    }
  }

  // Duplicate bank accounts
  const bankMap = new Map<string, string[]>();
  for (const line of period.lines) {
    const acc = line.employee.bankAccount?.replace(/\s/g, "");
    if (!acc || acc === "-") continue;
    const list = bankMap.get(acc) ?? [];
    list.push(line.employeeName);
    bankMap.set(acc, list);
  }
  for (const [, names] of bankMap) {
    if (names.length > 1) {
      issues.push({
        payrollPeriodId: periodId,
        severity: "WARNING",
        code: "BANK_DUPLICATE",
        message: `Rekening sama dipakai: ${names.join(", ")}`,
      });
    }
  }

  await prisma.payrollValidationIssue.deleteMany({
    where: { payrollPeriodId: periodId, status: "OPEN" },
  });

  if (issues.length) {
    await prisma.payrollValidationIssue.createMany({
      data: issues.map((i) => ({
        id: randomUUID(),
        payrollPeriodId: i.payrollPeriodId,
        payrollLineId: i.payrollLineId ?? null,
        employeeId: i.employeeId ?? null,
        severity: i.severity,
        code: i.code,
        message: i.message,
        status: "OPEN",
      })),
    });
  }

  return {
    total: issues.length,
    critical: issues.filter((i) => i.severity === "CRITICAL").length,
    warning: issues.filter((i) => i.severity === "WARNING").length,
    issues,
  };
}
