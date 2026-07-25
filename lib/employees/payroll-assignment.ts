/**
 * Active payroll-group assignment helpers.
 * Payroll group is never a denormalized column on employees.
 */

export type PayrollAssignmentLike = {
  id: string;
  payrollGroupId?: string | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  isActive?: boolean | null;
  status?: string | null;
  payrollGroup?: {
    id: string;
    code: string;
    name: string;
  } | null;
  project?: {
    id: string;
    code: string;
    name: string;
  } | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Pick the active payroll assignment as of referenceDate.
 * - effectiveFrom <= ref
 * - effectiveTo null or >= ref
 * - isActive !== false
 * - status empty or ACTIVE/OPEN/CURRENT
 * - latest effectiveFrom wins
 */
export function getActivePayrollAssignment<T extends PayrollAssignmentLike>(
  assignments: T[] | null | undefined,
  referenceDate: Date = new Date(),
): T | null {
  if (!assignments?.length) return null;
  const ref = startOfDay(referenceDate);

  const eligible = assignments.filter((a) => {
    if (a.isActive === false) return false;
    if (a.status) {
      const s = a.status.toUpperCase();
      if (s !== "ACTIVE" && s !== "OPEN" && s !== "CURRENT") return false;
    }
    const from = toDate(a.effectiveFrom);
    if (!from) return false;
    if (startOfDay(from) > ref) return false;
    const to = toDate(a.effectiveTo ?? null);
    if (to && startOfDay(to) < ref) return false;
    return true;
  });

  if (!eligible.length) return null;

  eligible.sort(
    (a, b) =>
      (toDate(b.effectiveFrom)?.getTime() ?? 0) -
      (toDate(a.effectiveFrom)?.getTime() ?? 0),
  );
  return eligible[0] ?? null;
}

export function formatPayrollGroupLabel(
  assignment: PayrollAssignmentLike | null | undefined,
): string | undefined {
  const g = assignment?.payrollGroup;
  if (!g) return undefined;
  return `${g.code} · ${g.name}`;
}

/**
 * Prisma include args for active assignment as of reference date.
 * Loads a small candidate set (ordered by effective_from desc) then
 * getActivePayrollAssignment() picks the correct one if window filters differ.
 */
export function prismaActiveAssignmentArgs(referenceDate: Date = new Date()) {
  const ref = startOfDay(referenceDate);
  return {
    where: {
      isActive: true,
      effectiveFrom: { lte: ref },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: ref } }],
    },
    orderBy: { effectiveFrom: "desc" as const },
    take: 5,
    include: {
      payrollGroup: { select: { id: true, code: true, name: true } },
      project: { select: { id: true, code: true, name: true } },
      company: { select: { id: true, name: true } },
    },
  };
}
