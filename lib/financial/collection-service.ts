/**
 * CollectionService — activity log against receivables/invoices.
 */

import { prisma } from "@/lib/db";
import type { CollectionActivityType } from "@prisma/client";
import {
  recordFinancialAudit,
  type FinancialActor,
} from "@/lib/financial/audit";

export async function logCollectionActivity(input: {
  companyId: string;
  invoiceId?: string | null;
  activityType: CollectionActivityType;
  summary: string;
  note?: string | null;
  actor: FinancialActor;
}) {
  const activity = await prisma.$transaction(async (tx) => {
    const row = await tx.collectionActivity.create({
      data: {
        companyId: input.companyId,
        invoiceId: input.invoiceId ?? null,
        activityType: input.activityType,
        summary: input.summary,
        performedById: input.actor.id ?? null,
      },
    });
    if (input.note) {
      await tx.collectionNote.create({
        data: {
          activityId: row.id,
          body: input.note,
          createdById: input.actor.id ?? null,
        },
      });
    }
    return row;
  });

  await recordFinancialAudit({
    actor: input.actor,
    action: "COLLECTION_ACTIVITY",
    entityType: "CollectionActivity",
    entityId: activity.id,
    companyId: input.companyId,
    detail: input.summary,
  });

  return activity;
}
