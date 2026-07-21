/**
 * Metadata-driven formula engine (pure, no I/O).
 * Expressions: identifiers, numbers, + - * / ( ), and unary minus.
 * Identifiers resolve from a values map (component codes).
 */

export type FormulaNode = {
  code: string;
  expression: string;
  dependsOn: string[];
};

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Extract dependency identifiers from expression (excluding numeric literals). */
export function extractDependencies(expression: string): string[] {
  const tokens = expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  const deps = new Set<string>();
  for (const t of tokens) {
    if (IDENT.test(t)) deps.add(t);
  }
  return [...deps];
}

/**
 * Topological order of formula nodes by dependsOn.
 * Throws on circular dependency.
 */
export function topologicalSort(nodes: FormulaNode[]): FormulaNode[] {
  const byCode = new Map(nodes.map((n) => [n.code, n]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const order: FormulaNode[] = [];

  function visit(code: string, stack: string[]) {
    if (visited.has(code)) return;
    if (visiting.has(code)) {
      throw new FormulaError(
        `Circular dependency detected: ${[...stack, code].join(" → ")}`,
      );
    }
    visiting.add(code);
    const node = byCode.get(code);
    if (node) {
      for (const d of node.dependsOn) {
        if (byCode.has(d)) visit(d, [...stack, code]);
      }
      order.push(node);
    }
    visiting.delete(code);
    visited.add(code);
  }

  for (const n of nodes) visit(n.code, []);
  return order;
}

/** Safe arithmetic expression evaluator. */
export function evaluateExpression(
  expression: string,
  values: Record<string, number>,
): number {
  const src = expression.trim();
  if (!src) throw new FormulaError("Empty expression");

  let i = 0;
  const peek = () => src[i];
  const next = () => src[i++];

  function skipWs() {
    while (i < src.length && /\s/.test(src[i]!)) i++;
  }

  function parseNumber(): number {
    skipWs();
    let s = "";
    while (i < src.length && /[0-9.]/.test(src[i]!)) s += next();
    if (!s) throw new FormulaError(`Expected number at ${i}`);
    const n = Number(s);
    if (!Number.isFinite(n)) throw new FormulaError(`Invalid number ${s}`);
    return n;
  }

  function parseIdent(): string {
    skipWs();
    let s = "";
    while (i < src.length && /[A-Za-z0-9_]/.test(src[i]!)) s += next();
    if (!s) throw new FormulaError(`Expected identifier at ${i}`);
    return s;
  }

  function parseFactor(): number {
    skipWs();
    if (peek() === "(") {
      next();
      const v = parseExpr();
      skipWs();
      if (peek() !== ")") throw new FormulaError("Expected )");
      next();
      return v;
    }
    if (peek() === "-") {
      next();
      return -parseFactor();
    }
    if (peek() && /[0-9.]/.test(peek()!)) return parseNumber();
    const id = parseIdent();
    if (!(id in values)) {
      throw new FormulaError(`Unknown identifier: ${id}`);
    }
    return values[id]!;
  }

  function parseTerm(): number {
    let v = parseFactor();
    for (;;) {
      skipWs();
      if (peek() === "*") {
        next();
        v *= parseFactor();
      } else if (peek() === "/") {
        next();
        const d = parseFactor();
        if (d === 0) throw new FormulaError("Division by zero");
        v /= d;
      } else break;
    }
    return v;
  }

  function parseExpr(): number {
    let v = parseTerm();
    for (;;) {
      skipWs();
      if (peek() === "+") {
        next();
        v += parseTerm();
      } else if (peek() === "-") {
        next();
        v -= parseTerm();
      } else break;
    }
    return v;
  }

  const result = parseExpr();
  skipWs();
  if (i < src.length) throw new FormulaError(`Unexpected token at ${i}`);
  return Math.round(result * 100) / 100;
}

/** Evaluate a set of formula nodes in dependency order into values. */
export function evaluateFormulaGraph(
  nodes: FormulaNode[],
  baseValues: Record<string, number>,
): Record<string, number> {
  const ordered = topologicalSort(nodes);
  const values = { ...baseValues };
  for (const n of ordered) {
    values[n.code] = evaluateExpression(n.expression, values);
  }
  return values;
}

/** Default enterprise component graph for simulation/calculate when DB formulas empty. */
export function defaultComponentGraph(): FormulaNode[] {
  return [
    {
      code: "BasicSalary",
      expression: "BaseSalary",
      dependsOn: ["BaseSalary"],
    },
    {
      code: "TransportAllowance",
      expression: "BaseSalary * 0.05",
      dependsOn: ["BaseSalary"],
    },
    {
      code: "MealAllowance",
      expression: "BaseSalary * 0.05",
      dependsOn: ["BaseSalary"],
    },
    {
      code: "Overtime",
      expression: "OvertimeHours * (BaseSalary / 173) * 1.5",
      dependsOn: ["BaseSalary", "OvertimeHours"],
    },
    {
      code: "Bonus",
      expression: "BonusInput",
      dependsOn: ["BonusInput"],
    },
    {
      code: "Gross",
      expression:
        "BasicSalary + TransportAllowance + MealAllowance + Overtime + Bonus",
      dependsOn: [
        "BasicSalary",
        "TransportAllowance",
        "MealAllowance",
        "Overtime",
        "Bonus",
      ],
    },
    {
      code: "Loan",
      expression: "LoanInput",
      dependsOn: ["LoanInput"],
    },
    {
      code: "BPJSEmployee",
      expression: "BaseSalary * 0.04",
      dependsOn: ["BaseSalary"],
    },
    {
      code: "BPJSEmployer",
      expression: "BaseSalary * 0.0824",
      dependsOn: ["BaseSalary"],
    },
    {
      code: "PPH21",
      expression: "Gross * 0.05",
      dependsOn: ["Gross"],
    },
    {
      code: "NetSalary",
      expression: "Gross - Loan - BPJSEmployee - PPH21",
      dependsOn: ["Gross", "Loan", "BPJSEmployee", "PPH21"],
    },
    {
      code: "EmployerCost",
      expression: "Gross + BPJSEmployer",
      dependsOn: ["Gross", "BPJSEmployer"],
    },
  ];
}
