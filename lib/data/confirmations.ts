import { prisma } from "@/lib/db";
import type { SessionScope } from "@/lib/auth/scope";
import { companyWhere } from "@/lib/auth/scope";
import { maskAccount } from "@/lib/data/mappers";
import {
  createProofSignedUrl,
  uploadPaymentProof,
  validateProofFile,
} from "@/lib/storage/payment-proof";
import type { Role } from "@/types";
import { createHash, randomUUID } from "crypto";

function num(v: { toString(): string } | number | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}

function stableConfirmationNumber(periodId: string): string {
  const h = createHash("sha256").update(periodId + Date.now()).digest("hex").slice(0, 8).toUpperCase();
  return `PC-${h}`;
}

export type PaymentConfirmationListItem = {
  id: string;
  companyId: string;
  companyName: string;
  payrollPeriodId: string;
  periodName: string;
  instructionNumber: string;
  confirmationNumber: string;
  paymentAmount: number;
  paymentDate: string;
  status: string;
  referenceNumber: string;
  uploadedByName?: string | null;
  verifiedByName?: string | null;
  executionModel?: string | null;
};

export async function listPaymentConfirmations(scope: SessionScope) {
  const where = companyWhere(scope);
  // Select only list columns — avoid shipping full related rows (proof files, bank, etc.).
  const rows = await prisma.paymentConfirmation.findMany({
    where: where.companyId ? { companyId: where.companyId } : undefined,
    select: {
      id: true,
      companyId: true,
      payrollPeriodId: true,
      confirmationNumber: true,
      paymentAmount: true,
      paymentDate: true,
      status: true,
      referenceNumber: true,
      company: { select: { name: true } },
      payrollPeriod: { select: { name: true } },
      paymentInstruction: {
        select: { instructionNumber: true, executionModel: true },
      },
      uploadedBy: { select: { name: true } },
      verifiedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(
    (r): PaymentConfirmationListItem => ({
      id: r.id,
      companyId: r.companyId,
      companyName: r.company.name,
      payrollPeriodId: r.payrollPeriodId,
      periodName: r.payrollPeriod.name,
      instructionNumber: r.paymentInstruction.instructionNumber,
      confirmationNumber: r.confirmationNumber,
      paymentAmount: num(r.paymentAmount),
      paymentDate: r.paymentDate.toISOString().slice(0, 10),
      status: r.status,
      referenceNumber: r.referenceNumber,
      uploadedByName: r.uploadedBy?.name ?? null,
      verifiedByName: r.verifiedBy?.name ?? null,
      executionModel: r.paymentInstruction.executionModel,
    }),
  );
}

export async function getPaymentConfirmationDetail(
  id: string,
  scope: SessionScope,
) {
  const row = await prisma.paymentConfirmation.findUnique({
    where: { id },
    include: {
      company: true,
      payrollPeriod: { include: { sourceBankAccount: true } },
      paymentInstruction: { include: { sourceBankAccount: true } },
      uploadedBy: true,
      verifiedBy: true,
      files: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!row) return null;
  if (
    scope.role !== "SUPER_ADMIN" &&
    scope.companyId &&
    row.companyId !== scope.companyId
  ) {
    return null;
  }

  const files = await Promise.all(
    row.files.map(async (f) => {
      let signedUrl: string | null = null;
      try {
        signedUrl = await createProofSignedUrl(f.storagePath, 300);
      } catch {
        signedUrl = null;
      }
      return {
        id: f.id,
        fileName: f.fileName,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
        uploadedAt: f.uploadedAt.toISOString(),
        signedUrl,
        // never expose raw storagePath to UI consumers outside signed flow
      };
    }),
  );

  const audit = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: "PaymentConfirmation", entityId: id },
        {
          entity: "PayrollPeriod",
          entityId: row.payrollPeriodId,
          action: {
            in: [
              "PROOF_UPLOADED",
              "PROOF_VERIFIED",
              "PROOF_REJECTED",
              "PAYROLL_CLOSED",
              "SETTLEMENT",
            ],
          },
        },
      ],
    },
    orderBy: { timestamp: "desc" },
    take: 30,
  });

  return {
    id: row.id,
    confirmationNumber: row.confirmationNumber,
    status: row.status,
    paymentDate: row.paymentDate.toISOString().slice(0, 10),
    paymentAmount: num(row.paymentAmount),
    payerBank: row.payerBank,
    payerAccountName: row.payerAccountName,
    payerAccountMasked: row.payerAccountMasked,
    referenceNumber: row.referenceNumber,
    notes: row.notes,
    rejectionReason: row.rejectionReason,
    uploadedByName: row.uploadedBy?.name ?? null,
    verifiedByName: row.verifiedBy?.name ?? null,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    companyName: row.company.name,
    period: {
      id: row.payrollPeriod.id,
      name: row.payrollPeriod.name,
      status: row.payrollPeriod.status,
      fundingModel: row.payrollPeriod.fundingModel,
      fundingStatus: row.payrollPeriod.fundingStatus,
      paymentInstructionStatus: row.payrollPeriod.paymentInstructionStatus,
      reconciliationStatus: row.payrollPeriod.reconciliationStatus,
      confirmationStatus: row.payrollPeriod.confirmationStatus,
      totalNet: num(row.payrollPeriod.totalNet),
      totalGross: num(row.payrollPeriod.totalGross),
      employeeCount: row.payrollPeriod.employeeCount,
      payDate: row.payrollPeriod.payDate.toISOString().slice(0, 10),
    },
    instruction: {
      id: row.paymentInstruction.id,
      instructionNumber: row.paymentInstruction.instructionNumber,
      executionModel: row.paymentInstruction.executionModel,
      fundingModel: row.paymentInstruction.fundingModel,
      totalAmount: num(row.paymentInstruction.totalAmount),
      totalRecords: row.paymentInstruction.totalRecords,
      executionStatus: row.paymentInstruction.executionStatus,
      integrationStatus: row.paymentInstruction.integrationStatus,
    },
    files,
    audit: audit.map((a) => ({
      id: a.id,
      action: a.action,
      userName: a.userName,
      timestamp: a.timestamp.toISOString(),
      detail: a.detail,
    })),
  };
}

export function canUploadProof(role: Role): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "PAYROLL_ADMIN" ||
    role === "FINANCE" ||
    role === "HR"
  );
}

export function canVerifyProof(role: Role): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "FINANCE" ||
    role === "PAYROLL_ADMIN" ||
    role === "DIRECTOR"
  );
}

async function notifyRoles(
  companyId: string,
  roles: Role[],
  payload: {
    type: string;
    title: string;
    body: string;
    entity: string;
    entityId: string;
  },
) {
  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      OR: [{ companyId }, { role: "SUPER_ADMIN" }, { role: "DIRECTOR" }],
    },
    select: { id: true },
  });
  if (!users.length) return;
  await prisma.appNotification.createMany({
    data: users.map((u) => ({
      id: randomUUID(),
      userId: u.id,
      companyId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      entity: payload.entity,
      entityId: payload.entityId,
    })),
  });
}

export async function createPaymentConfirmation(input: {
  scope: SessionScope;
  paymentInstructionId: string;
  paymentDate: string;
  paymentAmount: number;
  payerBank: string;
  payerAccountName: string;
  payerAccount: string;
  referenceNumber: string;
  notes?: string;
  fileName: string;
  mimeType: string;
  fileBytes: Buffer;
}) {
  if (!canUploadProof(input.scope.role)) {
    throw new Error("Not allowed to upload transfer proof.");
  }

  const validation = validateProofFile(
    input.mimeType,
    input.fileBytes.length,
  );
  if (validation) throw new Error(validation);

  const instruction = await prisma.paymentInstruction.findUnique({
    where: { id: input.paymentInstructionId },
    include: { payrollPeriod: true },
  });
  if (!instruction) throw new Error("Payment instruction not found.");

  if (
    input.scope.role !== "SUPER_ADMIN" &&
    input.scope.companyId &&
    instruction.companyId !== input.scope.companyId
  ) {
    throw new Error("Cross-company access denied.");
  }

  const confirmationId = randomUUID();
  const { storagePath } = await uploadPaymentProof({
    companyId: instruction.companyId,
    payrollPeriodId: instruction.payrollPeriodId,
    confirmationId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    bytes: input.fileBytes,
  });

  const confirmation = await prisma.$transaction(async (tx) => {
    const created = await tx.paymentConfirmation.create({
      data: {
        id: confirmationId,
        companyId: instruction.companyId,
        payrollPeriodId: instruction.payrollPeriodId,
        paymentInstructionId: instruction.id,
        confirmationNumber: stableConfirmationNumber(instruction.payrollPeriodId),
        paymentDate: new Date(input.paymentDate),
        paymentAmount: input.paymentAmount,
        payerBank: input.payerBank,
        payerAccountName: input.payerAccountName,
        payerAccountMasked: maskAccount(input.payerAccount),
        referenceNumber: input.referenceNumber,
        status: "UPLOADED",
        notes: input.notes,
        uploadedById: input.scope.userId,
      },
    });

    await tx.paymentConfirmationFile.create({
      data: {
        id: randomUUID(),
        paymentConfirmationId: created.id,
        storagePath,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileBytes.length,
      },
    });

    await tx.payrollPeriod.update({
      where: { id: instruction.payrollPeriodId },
      data: {
        status: "TRANSFER_PROOF_UPLOADED",
        confirmationStatus: "UPLOADED",
        paymentInstructionStatus: "SUBMITTED",
      },
    });

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        companyId: instruction.companyId,
        userId: input.scope.userId,
        userName: "User",
        userRole: input.scope.role,
        action: "PROOF_UPLOADED",
        entity: "PaymentConfirmation",
        entityId: created.id,
        detail: `Proof uploaded for instruction ${instruction.instructionNumber}`,
        ip: "app",
      },
    });

    return created;
  });

  // Fix audit user name
  const user = await prisma.user.findUnique({
    where: { id: input.scope.userId },
  });
  if (user) {
    await prisma.auditLog.updateMany({
      where: {
        entityId: confirmation.id,
        action: "PROOF_UPLOADED",
      },
      data: { userName: user.name },
    });
  }

  await notifyRoles(instruction.companyId, ["FINANCE", "PAYROLL_ADMIN", "DIRECTOR"], {
    type: "PROOF_UPLOADED",
    title: "Transfer proof uploaded",
    body: `Confirmation ${confirmation.confirmationNumber} awaits verification.`,
    entity: "PaymentConfirmation",
    entityId: confirmation.id,
  });

  return confirmation.id;
}

export async function verifyPaymentConfirmation(input: {
  scope: SessionScope;
  confirmationId: string;
  decision: "VERIFIED" | "REJECTED" | "NEED_REVISION";
  reason?: string;
}) {
  if (!canVerifyProof(input.scope.role)) {
    throw new Error("Not allowed to verify transfer proof.");
  }

  const row = await prisma.paymentConfirmation.findUnique({
    where: { id: input.confirmationId },
    include: { payrollPeriod: true, paymentInstruction: true },
  });
  if (!row) throw new Error("Confirmation not found.");

  if (
    input.scope.role !== "SUPER_ADMIN" &&
    input.scope.companyId &&
    row.companyId !== input.scope.companyId
  ) {
    throw new Error("Cross-company access denied.");
  }

  const user = await prisma.user.findUnique({
    where: { id: input.scope.userId },
  });

  await prisma.$transaction(async (tx) => {
    await tx.paymentConfirmation.update({
      where: { id: row.id },
      data: {
        status:
          input.decision === "VERIFIED"
            ? "VERIFIED"
            : input.decision === "REJECTED"
              ? "REJECTED"
              : "NEED_REVISION",
        rejectionReason:
          input.decision === "VERIFIED" ? null : input.reason ?? null,
        verifiedById: input.scope.userId,
        verifiedAt: new Date(),
      },
    });

    if (input.decision === "VERIFIED") {
      const isWc = row.payrollPeriod.fundingModel === "WORKING_CAPITAL";
      await tx.payrollPeriod.update({
        where: { id: row.payrollPeriodId },
        data: {
          status: isWc ? "VERIFIED" : "CLOSED",
          confirmationStatus: "VERIFIED",
          reconciliationStatus: isWc ? "IN_PROGRESS" : "RECONCILED",
          paymentInstructionStatus: "EXECUTED",
        },
      });
      if (!isWc) {
        // Client self-transfer closed after verification
      } else {
        // WC path: mark settlement pending on WC request
        await tx.workingCapitalRequest.updateMany({
          where: { payrollPeriodId: row.payrollPeriodId },
          data: { settlementStatus: "PENDING", status: "SETTLEMENT_DUE" },
        });
      }
    } else {
      await tx.payrollPeriod.update({
        where: { id: row.payrollPeriodId },
        data: {
          status: "WAITING_CLIENT_TRANSFER",
          confirmationStatus: input.decision,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        companyId: row.companyId,
        userId: input.scope.userId,
        userName: user?.name ?? "Verifier",
        userRole: input.scope.role,
        action:
          input.decision === "VERIFIED"
            ? "PROOF_VERIFIED"
            : input.decision === "REJECTED"
              ? "PROOF_REJECTED"
              : "PROOF_NEED_REVISION",
        entity: "PaymentConfirmation",
        entityId: row.id,
        detail: input.reason ?? input.decision,
        ip: "app",
      },
    });

    if (input.decision === "VERIFIED" && row.payrollPeriod.fundingModel !== "WORKING_CAPITAL") {
      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          companyId: row.companyId,
          userId: input.scope.userId,
          userName: user?.name ?? "Verifier",
          userRole: input.scope.role,
          action: "PAYROLL_CLOSED",
          entity: "PayrollPeriod",
          entityId: row.payrollPeriodId,
          detail: "Closed after transfer proof verification (client self-transfer)",
          ip: "app",
        },
      });
    }
  });

  const notifType =
    input.decision === "VERIFIED"
      ? "VERIFICATION_APPROVED"
      : "VERIFICATION_REJECTED";

  await notifyRoles(
    row.companyId,
    ["PAYROLL_ADMIN", "FINANCE", "SUPER_ADMIN"],
    {
      type: notifType,
      title:
        input.decision === "VERIFIED"
          ? "Verification approved"
          : "Verification rejected",
      body: `Confirmation ${row.confirmationNumber}: ${input.decision}`,
      entity: "PaymentConfirmation",
      entityId: row.id,
    },
  );
}

export async function closePayrollAfterSettlement(input: {
  scope: SessionScope;
  payrollPeriodId: string;
}) {
  if (!canVerifyProof(input.scope.role)) {
    throw new Error("Not allowed.");
  }
  await prisma.payrollPeriod.update({
    where: { id: input.payrollPeriodId },
    data: {
      status: "CLOSED",
      reconciliationStatus: "RECONCILED",
      fundingStatus: "SETTLED",
    },
  });
  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      companyId: input.scope.companyId,
      userId: input.scope.userId,
      userName: "System",
      userRole: input.scope.role,
      action: "SETTLEMENT",
      entity: "PayrollPeriod",
      entityId: input.payrollPeriodId,
      detail: "Settlement complete; payroll closed",
      ip: "app",
    },
  });
}

export async function getConfirmationKpis(scope: SessionScope) {
  const where = companyWhere(scope);
  const companyFilter = where.companyId
    ? { companyId: where.companyId }
    : {};

  const [
    waitingTransfer,
    waitingVerification,
    rejected,
    verifiedToday,
    closed,
    pendingConfirmation,
  ] = await Promise.all([
    prisma.payrollPeriod.count({
      where: { ...companyFilter, status: "WAITING_CLIENT_TRANSFER" },
    }),
    prisma.paymentConfirmation.count({
      where: {
        ...companyFilter,
        status: { in: ["UPLOADED", "UNDER_REVIEW"] },
      },
    }),
    prisma.paymentConfirmation.count({
      where: { ...companyFilter, status: "REJECTED" },
    }),
    prisma.paymentConfirmation.count({
      where: {
        ...companyFilter,
        status: "VERIFIED",
        verifiedAt: {
          gte: new Date(new Date().toISOString().slice(0, 10)),
        },
      },
    }),
    prisma.payrollPeriod.count({
      where: { ...companyFilter, status: "CLOSED" },
    }),
    prisma.payrollPeriod.count({
      where: {
        ...companyFilter,
        status: {
          in: [
            "PAYMENT_INSTRUCTION_GENERATED",
            "WAITING_CLIENT_TRANSFER",
            "TRANSFER_PROOF_UPLOADED",
            "UNDER_VERIFICATION",
          ],
        },
      },
    }),
  ]);

  return {
    waitingTransfer,
    waitingVerification,
    rejected,
    verifiedToday,
    closed,
    pendingConfirmation,
  };
}

export async function listInstructionsAwaitingProof(scope: SessionScope) {
  const where = companyWhere(scope);
  return prisma.paymentInstruction.findMany({
    where: {
      ...(where.companyId ? { companyId: where.companyId } : {}),
      executionStatus: { in: ["READY", "SUBMITTED", "DRAFT"] },
    },
    include: { payrollPeriod: true, company: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
