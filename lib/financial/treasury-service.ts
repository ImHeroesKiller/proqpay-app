/**
 * TreasuryService — accounts and cash movements (immutable ledger rows).
 */

import { prisma } from "@/lib/db";
import type { CashMovementType } from "@prisma/client";
import {
  recordFinancialAudit,
  type FinancialActor,
} from "@/lib/financial/audit";

export async function createTreasuryAccount(input: {
  organizationId: string;
  companyId?: string | null;
  code: string;
  name: string;
  currency?: string;
  bankName?: string | null;
  accountNumber?: string | null;
  actor: FinancialActor;
}) {
  const account = await prisma.treasuryAccount.create({
    data: {
      organizationId: input.organizationId,
      companyId: input.companyId ?? null,
      code: input.code,
      name: input.name,
      currency: input.currency ?? "IDR",
      bankName: input.bankName ?? null,
      accountNumber: input.accountNumber ?? null,
    },
  });
  await recordFinancialAudit({
    actor: input.actor,
    action: "TREASURY_ACCOUNT_CREATED",
    entityType: "TreasuryAccount",
    entityId: account.id,
    companyId: account.companyId,
  });
  return account;
}

export async function postCashMovement(input: {
  organizationId: string;
  companyId?: string | null;
  treasuryAccountId: string;
  movementType: CashMovementType;
  amount: number;
  movementDate: Date;
  currency?: string;
  reference?: string | null;
  description?: string | null;
  clientPaymentId?: string | null;
  actor: FinancialActor;
}) {
  if (input.amount <= 0) throw new Error("Movement amount must be positive");
  const movement = await prisma.cashMovement.create({
    data: {
      organizationId: input.organizationId,
      companyId: input.companyId ?? null,
      treasuryAccountId: input.treasuryAccountId,
      movementType: input.movementType,
      amount: input.amount,
      currency: input.currency ?? "IDR",
      movementDate: input.movementDate,
      reference: input.reference ?? null,
      description: input.description ?? null,
      clientPaymentId: input.clientPaymentId ?? null,
      createdById: input.actor.id ?? null,
    },
  });
  await recordFinancialAudit({
    actor: input.actor,
    action: "CASH_MOVEMENT_POSTED",
    entityType: "CashMovement",
    entityId: movement.id,
    companyId: movement.companyId,
    after: {
      type: input.movementType,
      amount: input.amount,
    },
  });
  return movement;
}

export async function listTreasurySummary(organizationId: string) {
  const accounts = await prisma.treasuryAccount.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, code: true, name: true, currency: true },
  });
  const movements = await prisma.cashMovement.groupBy({
    by: ["treasuryAccountId", "movementType"],
    where: { organizationId },
    _sum: { amount: true },
  });
  return { accounts, movements };
}
