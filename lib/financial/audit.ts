import { prisma } from "@/lib/db";

export type FinancialActor = {
  id?: string | null;
  name: string;
  role: string;
  companyId?: string | null;
};

/** Append-only financial audit record. */
export async function recordFinancialAudit(input: {
  actor: FinancialActor;
  action: string;
  entityType: string;
  entityId: string;
  detail?: string;
  before?: unknown;
  after?: unknown;
  companyId?: string | null;
}) {
  return prisma.financialAudit.create({
    data: {
      companyId: input.companyId ?? input.actor.companyId ?? null,
      actorId: input.actor.id ?? null,
      actorName: input.actor.name,
      actorRole: input.actor.role,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      detail: input.detail,
      beforeJson: input.before ? JSON.stringify(input.before) : null,
      afterJson: input.after ? JSON.stringify(input.after) : null,
    },
  });
}
