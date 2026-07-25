import { describe, expect, it } from "vitest";
import {
  formatPayrollGroupLabel,
  getActivePayrollAssignment,
} from "@/lib/employees/payroll-assignment";

describe("getActivePayrollAssignment", () => {
  const groupA = { id: "g1", code: "PG-A", name: "Group A" };
  const groupB = { id: "g2", code: "PG-B", name: "Group B" };

  it("returns null for empty list", () => {
    expect(getActivePayrollAssignment([])).toBeNull();
  });

  it("picks latest active assignment within window", () => {
    const ref = new Date("2026-07-15");
    const active = getActivePayrollAssignment(
      [
        {
          id: "1",
          effectiveFrom: new Date("2026-01-01"),
          effectiveTo: new Date("2026-06-30"),
          isActive: false,
          status: "SUPERSEDED",
          payrollGroup: groupA,
        },
        {
          id: "2",
          effectiveFrom: new Date("2026-07-01"),
          effectiveTo: null,
          isActive: true,
          status: "ACTIVE",
          payrollGroup: groupB,
        },
      ],
      ref,
    );
    expect(active?.id).toBe("2");
    expect(formatPayrollGroupLabel(active)).toBe("PG-B · Group B");
  });

  it("ignores future effective_from", () => {
    const ref = new Date("2026-07-15");
    const active = getActivePayrollAssignment(
      [
        {
          id: "1",
          effectiveFrom: new Date("2026-08-01"),
          isActive: true,
          status: "ACTIVE",
          payrollGroup: groupA,
        },
      ],
      ref,
    );
    expect(active).toBeNull();
  });

  it("sorts by effectiveFrom desc when multiple active", () => {
    const ref = new Date("2026-07-15");
    const active = getActivePayrollAssignment(
      [
        {
          id: "old",
          effectiveFrom: new Date("2025-01-01"),
          isActive: true,
          status: "ACTIVE",
          payrollGroup: groupA,
        },
        {
          id: "new",
          effectiveFrom: new Date("2026-03-01"),
          isActive: true,
          status: "ACTIVE",
          payrollGroup: groupB,
        },
      ],
      ref,
    );
    expect(active?.id).toBe("new");
  });
});
