import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { calculatePayrollLine, DEFAULT_BPJS, DEFAULT_TAX } from "@/lib/payroll/engine";
import { randomUUID } from "crypto";
import type { Role } from "@/types";

async function audit(
  scope: SessionScope,
  action: string,
  entity: string,
  entityId: string,
  detail?: string,
  companyId?: string | null,
) {
  const user = await prisma.user.findUnique({ where: { id: scope.userId } });
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      companyId: companyId ?? scope.companyId,
      userId: scope.userId,
      userName: user?.name ?? "User",
      userRole: scope.role,
      action,
      entity,
      entityId,
      detail,
      ip: "app",
    },
  });
}

export async function submitPayrollForApproval(
  scope: SessionScope,
  periodId: string,
) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { approvals: true },
  });
  if (!period) throw new Error("Payroll period not found");
  if (scope.role !== "SUPER_ADMIN" && scope.companyId && period.companyId !== scope.companyId) {
    throw new Error("Cross-company denied");
  }
  if (!["DRAFT", "REJECTED"].includes(period.status)) {
    throw new Error("Only DRAFT or REJECTED periods can be submitted");
  }

  const matrix = await prisma.approvalMatrix.findMany({
    where: { companyId: period.companyId, isActive: true },
    orderBy: { level: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.deleteMany({ where: { payrollPeriodId: periodId } });
    if (matrix.length) {
      for (const m of matrix) {
        await tx.approvalStep.create({
          data: {
            id: randomUUID(),
            payrollPeriodId: periodId,
            level: m.level,
            approverName: m.role.replaceAll("_", " "),
            role: m.role,
            status: "PENDING",
          },
        });
      }
    } else {
      // Default 2-level matrix
      const defaults: { level: number; role: Role; name: string }[] = [
        { level: 1, role: "PAYROLL_ADMIN", name: "Payroll Admin" },
        { level: 2, role: "FINANCE", name: "Finance" },
        { level: 3, role: "DIRECTOR", name: "Director" },
      ];
      for (const d of defaults) {
        await tx.approvalStep.create({
          data: {
            id: randomUUID(),
            payrollPeriodId: periodId,
            level: d.level,
            approverName: d.name,
            role: d.role,
            status: "PENDING",
          },
        });
      }
    }
    await tx.payrollPeriod.update({
      where: { id: periodId },
      data: { status: "WAITING" },
    });
  });

  await audit(scope, "SUBMIT_FOR_APPROVAL", "PayrollPeriod", periodId, undefined, period.companyId);
}

export async function actOnApprovalStep(
  scope: SessionScope,
  stepId: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
) {
  const step = await prisma.approvalStep.findUnique({
    where: { id: stepId },
    include: { payrollPeriod: true },
  });
  if (!step) throw new Error("Approval step not found");
  if (step.status !== "PENDING") throw new Error("Step already actioned");

  const period = step.payrollPeriod;
  if (scope.role !== "SUPER_ADMIN" && scope.companyId && period.companyId !== scope.companyId) {
    throw new Error("Cross-company denied");
  }

  // Role match or SUPER_ADMIN/DIRECTOR override
  const canAct =
    scope.role === "SUPER_ADMIN" ||
    scope.role === "DIRECTOR" ||
    scope.role === step.role ||
    (scope.role === "PAYROLL_ADMIN" && step.level === 1);
  if (!canAct) throw new Error("Not authorized for this approval level");

  const user = await prisma.user.findUnique({ where: { id: scope.userId } });

  await prisma.$transaction(async (tx) => {
    await tx.approvalStep.update({
      where: { id: stepId },
      data: {
        status: decision,
        comment: comment ?? null,
        actedAt: new Date(),
        userId: scope.userId,
        approverName: user?.name ?? step.approverName,
      },
    });

    if (decision === "REJECTED") {
      await tx.payrollPeriod.update({
        where: { id: period.id },
        data: { status: "REJECTED" },
      });
    } else {
      const pending = await tx.approvalStep.count({
        where: { payrollPeriodId: period.id, status: "PENDING" },
      });
      if (pending === 0) {
        await tx.payrollPeriod.update({
          where: { id: period.id },
          data: { status: "APPROVED" },
        });
      }
    }
  });

  await audit(
    scope,
    decision === "APPROVED" ? "APPROVE_PAYROLL" : "REJECT_PAYROLL",
    "ApprovalStep",
    stepId,
    comment,
    period.companyId,
  );
}

export async function recalculatePayrollPeriod(
  scope: SessionScope,
  periodId: string,
) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { lines: true },
  });
  if (!period) throw new Error("Period not found");
  if (scope.role !== "SUPER_ADMIN" && scope.companyId && period.companyId !== scope.companyId) {
    throw new Error("Cross-company denied");
  }
  if (["LOCKED", "CLOSED", "DISBURSED"].includes(period.status)) {
    throw new Error("Cannot recalculate locked/closed period");
  }

  const bpjsCfg = await prisma.bpjsConfig.findFirst({
    where: { companyId: period.companyId, isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });
  const taxCfg = await prisma.taxConfig.findFirst({
    where: { companyId: period.companyId, isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });

  const bpjsRates = bpjsCfg
    ? {
        kesehatanEmployee: Number(bpjsCfg.kesehatanEmployee),
        kesehatanEmployer: Number(bpjsCfg.kesehatanEmployer),
        jhtEmployee: Number(bpjsCfg.jhtEmployee),
        jhtEmployer: Number(bpjsCfg.jhtEmployer),
        jkkEmployer: Number(bpjsCfg.jkkEmployer),
        jkmEmployer: Number(bpjsCfg.jkmEmployer),
        jpEmployee: Number(bpjsCfg.jpEmployee),
        jpEmployer: Number(bpjsCfg.jpEmployer),
        maxWageKesehatan: Number(bpjsCfg.maxWageKesehatan),
        maxWageJp: Number(bpjsCfg.maxWageJp),
      }
    : DEFAULT_BPJS;

  const taxRates = taxCfg
    ? {
        defaultTerRate: Number(taxCfg.defaultTerRate),
        nonNpwpSurcharge: Number(taxCfg.nonNpwpSurcharge),
      }
    : DEFAULT_TAX;

  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalBpjsEmp = 0;
  let totalBpjsEr = 0;
  let totalPph = 0;

  for (const line of period.lines) {
    const emp = await prisma.employee.findUnique({ where: { id: line.employeeId } });
    const calc = calculatePayrollLine(
      {
        baseSalary: Number(emp?.baseSalary ?? line.baseSalary),
        hasNpwp: Boolean(emp?.npwp && emp.npwp.length > 5),
        taxStatus: emp?.taxStatus ?? emp?.ptkpStatus,
      },
      bpjsRates,
      taxRates,
    );

    await prisma.payrollLine.update({
      where: { id: line.id },
      data: {
        baseSalary: calc.baseSalary,
        allowances: calc.allowances,
        overtime: calc.overtime,
        bonuses: calc.bonuses,
        deductions: calc.deductions,
        tax: calc.tax,
        bpjs: calc.bpjs,
        netPay: calc.netPay,
      },
    });

    totalGross += calc.gross;
    totalDeductions += calc.deductions + calc.bpjs + calc.tax;
    totalNet += calc.netPay;
    totalBpjsEmp += calc.bpjs;
    totalBpjsEr += calc.bpjsEmployer;
    totalPph += calc.pph21;
  }

  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      totalGross,
      totalDeductions,
      totalNet,
      totalBpjsEmployee: totalBpjsEmp,
      totalBpjsEmployer: totalBpjsEr,
      totalPph21: totalPph,
      version: { increment: 1 },
      employeeCount: period.lines.length,
    },
  });

  await audit(scope, "RECALCULATE_PAYROLL", "PayrollPeriod", periodId, `v${period.version + 1}`, period.companyId);
}

export async function generatePaymentInstruction(
  scope: SessionScope,
  periodId: string,
) {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { lines: true, company: true },
  });
  if (!period) throw new Error("Period not found");
  if (scope.role !== "SUPER_ADMIN" && scope.companyId && period.companyId !== scope.companyId) {
    throw new Error("Cross-company denied");
  }
  if (!["APPROVED", "LOCKED", "PAYMENT_INSTRUCTION_GENERATED", "WAITING_CLIENT_TRANSFER"].includes(period.status)) {
    throw new Error("Period must be APPROVED before generating instruction");
  }

  const bank = await prisma.bankAccount.findFirst({
    where: { companyId: period.companyId, purpose: "CLIENT_PAYROLL_SOURCE" },
  });

  const executionModel =
    period.fundingModel === "WORKING_CAPITAL"
      ? "WORKING_CAPITAL"
      : "CLIENT_SELF_TRANSFER";

  const count = await prisma.paymentInstruction.count({
    where: { payrollPeriodId: periodId },
  });
  const instructionNumber = `PI-${period.name.replace(/\s+/g, "").toUpperCase()}-${String(count + 1).padStart(3, "0")}`;

  const id = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.paymentInstruction.create({
      data: {
        id,
        companyId: period.companyId,
        payrollPeriodId: period.id,
        instructionNumber,
        fundingModel: period.fundingModel,
        executionModel,
        executionType:
          executionModel === "WORKING_CAPITAL"
            ? "PROQPAY_MANAGED_TRANSFER"
            : "CLIENT_BANK_TRANSFER",
        integrationStatus: "SIMULATED",
        sourceBankAccountId: bank?.id ?? period.sourceBankAccountId,
        totalRecords: period.lines.length,
        totalAmount: period.totalNet,
        currency: "IDR",
        approvalStatus: "APPROVED",
        executionStatus: "READY",
        generatedById: scope.userId,
        generatedAt: new Date(),
        version: 1,
      },
    });

    for (const line of period.lines) {
      const emp = await prisma.employee.findUnique({ where: { id: line.employeeId } });
      await tx.paymentInstructionItem.create({
        data: {
          id: randomUUID(),
          paymentInstructionId: id,
          payrollLineId: line.id,
          employeeId: line.employeeId,
          recipientName: line.employeeName,
          bankCode: emp?.bankName ?? null,
          maskedAccountNumber: emp?.bankAccount
            ? `••••${emp.bankAccount.slice(-4)}`
            : "••••",
          amount: line.netPay,
          status: "READY",
        },
      });
    }

    await tx.payrollPeriod.update({
      where: { id: periodId },
      data: {
        status: "WAITING_CLIENT_TRANSFER",
        paymentInstructionStatus: "READY",
      },
    });
  });

  await audit(scope, "GENERATE_PAYMENT_INSTRUCTION", "PaymentInstruction", id, instructionNumber, period.companyId);
  return id;
}

export async function buildInstructionCsv(instructionId: string): Promise<string> {
  const pi = await prisma.paymentInstruction.findUnique({
    where: { id: instructionId },
    include: { items: true, payrollPeriod: true, company: true },
  });
  if (!pi) throw new Error("Instruction not found");

  const header = [
    "instruction_number",
    "period",
    "company",
    "employee_name",
    "bank",
    "account_masked",
    "amount",
    "currency",
    "execution_model",
  ].join(",");

  const rows = pi.items.map((it) =>
    [
      pi.instructionNumber,
      pi.payrollPeriod.name,
      pi.company.name,
      `"${it.recipientName}"`,
      it.bankCode ?? "",
      it.maskedAccountNumber,
      Number(it.amount).toFixed(2),
      pi.currency,
      pi.executionModel,
    ].join(","),
  );

  return [header, ...rows].join("\n");
}
