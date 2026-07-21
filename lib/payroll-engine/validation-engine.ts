/**
 * Modular payroll validation rules (pure).
 */

export type ValidationIssue = {
  code: string;
  severity: "INFO" | "WARNING" | "ERROR" | "BLOCKER";
  message: string;
  employeeId?: string | null;
  employeeName?: string | null;
};

export type EmployeeCalcRow = {
  employeeId?: string | null;
  employeeCode?: string | null;
  employeeName: string;
  active?: boolean;
  values: Record<string, number>;
};

export type ValidationContext = {
  employees: EmployeeCalcRow[];
  budgetAmount?: number | null;
  totalNet?: number;
  minSalary?: number;
  maxSalary?: number;
  approvalReady?: boolean;
};

export function runValidationRules(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const emp of ctx.employees) {
    const key = emp.employeeId ?? emp.employeeCode ?? emp.employeeName;
    if (seen.has(key)) {
      issues.push({
        code: "DUPLICATE_EMPLOYEE",
        severity: "BLOCKER",
        message: `Duplicate employee in run: ${emp.employeeName}`,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
      });
    }
    seen.add(key);

    if (emp.active === false) {
      issues.push({
        code: "INACTIVE_EMPLOYEE",
        severity: "ERROR",
        message: `Inactive employee included: ${emp.employeeName}`,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
      });
    }

    const net = emp.values.NetSalary ?? emp.values.NET ?? 0;
    if (net < 0) {
      issues.push({
        code: "NEGATIVE_PAYROLL",
        severity: "BLOCKER",
        message: `Negative net salary for ${emp.employeeName}`,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
      });
    }

    const basic = emp.values.BasicSalary ?? emp.values.BaseSalary ?? 0;
    if (ctx.minSalary != null && basic > 0 && basic < ctx.minSalary) {
      issues.push({
        code: "SALARY_BELOW_MINIMUM",
        severity: "WARNING",
        message: `Basic salary below minimum for ${emp.employeeName}`,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
      });
    }
    if (ctx.maxSalary != null && basic > ctx.maxSalary) {
      issues.push({
        code: "SALARY_ABOVE_MAXIMUM",
        severity: "WARNING",
        message: `Basic salary above maximum for ${emp.employeeName}`,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
      });
    }

    if (!("BasicSalary" in emp.values) && !("BaseSalary" in emp.values)) {
      issues.push({
        code: "MISSING_COMPONENT",
        severity: "ERROR",
        message: `Missing basic salary component for ${emp.employeeName}`,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
      });
    }

    const bpjs = emp.values.BPJSEmployee;
    if (bpjs != null && bpjs < 0) {
      issues.push({
        code: "INVALID_BPJS",
        severity: "ERROR",
        message: `Invalid BPJS for ${emp.employeeName}`,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
      });
    }
    const tax = emp.values.PPH21;
    if (tax != null && tax < 0) {
      issues.push({
        code: "INVALID_TAX",
        severity: "ERROR",
        message: `Invalid tax for ${emp.employeeName}`,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
      });
    }

    // duplicate component codes within values object keys not possible; check zero codes
    const codes = Object.keys(emp.values);
    if (new Set(codes).size !== codes.length) {
      issues.push({
        code: "DUPLICATE_COMPONENT",
        severity: "ERROR",
        message: `Duplicate component codes for ${emp.employeeName}`,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
      });
    }
  }

  if (ctx.budgetAmount != null && ctx.totalNet != null) {
    if (ctx.totalNet > ctx.budgetAmount + 0.0001) {
      issues.push({
        code: "PAYROLL_BUDGET_EXCEEDED",
        severity: "BLOCKER",
        message: `Payroll net ${ctx.totalNet} exceeds budget ${ctx.budgetAmount}`,
      });
    }
  }

  if (ctx.approvalReady === false) {
    issues.push({
      code: "MISSING_APPROVAL",
      severity: "WARNING",
      message: "Payroll is not ready for approval workflow",
    });
  }

  if (ctx.employees.length === 0) {
    issues.push({
      code: "NO_EMPLOYEES",
      severity: "BLOCKER",
      message: "No employees in calculation run",
    });
  }

  return issues;
}

export function hasBlockers(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "BLOCKER" || i.severity === "ERROR");
}
