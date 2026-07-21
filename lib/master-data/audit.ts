import { prisma } from "@/lib/db";
import type { Role } from "@/types";

export async function recordMasterDataAudit(input: {
  userId?: string | null;
  userName: string;
  userRole: Role;
  companyId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  detail?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}) {
  const detailParts = [input.detail];
  if (input.before !== undefined) {
    detailParts.push(`before=${JSON.stringify(input.before)}`);
  }
  if (input.after !== undefined) {
    detailParts.push(`after=${JSON.stringify(input.after)}`);
  }
  return prisma.auditLog.create({
    data: {
      companyId: input.companyId ?? null,
      userId: input.userId ?? null,
      userName: input.userName,
      userRole: input.userRole,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      detail: detailParts.filter(Boolean).join(" | ").slice(0, 4000),
      ip: input.ip ?? "system",
    },
  });
}
