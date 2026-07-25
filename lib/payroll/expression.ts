/**
 * Controlled expression engine for payroll formulas.
 * Whitelist operators only — no eval, no Function constructor.
 */

const ALLOWED_VARS = new Set([
  "BASIC_SALARY",
  "PRESENT_DAYS",
  "WORK_DAYS",
  "ABSENT_DAYS",
  "OVERTIME_HOURS",
  "HOURLY_RATE",
  "GROSS",
  "ALLOWANCES",
  "BONUS",
  "DEDUCTION",
  "RATE",
  "QUANTITY",
  "AMOUNT",
]);

export type ExpressionContext = Record<string, number>;

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  const re =
    /\s*([A-Z_][A-Z0-9_]*|\d+(?:\.\d+)?|[+\-*/().,]|<=|>=|==|!=|<|>)\s*/gy;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr)) !== null) {
    tokens.push(m[1]);
    if (m.index + m[0].length === expr.length) break;
  }
  if (tokens.join("").replace(/\s/g, "") !== expr.replace(/\s/g, "")) {
    // fallback length check — reject unknown chars
    if (/[^A-Za-z0-9_+\-*/().,\s<>=!]/.test(expr)) {
      throw new Error("Ekspresi berisi karakter yang tidak diizinkan");
    }
  }
  return tokens;
}

/** Recursive descent parser for + - * / ( ) and comparisons (return 0/1). */
export function evaluateExpression(
  expression: string,
  ctx: ExpressionContext,
): number {
  const expr = expression.trim().toUpperCase();
  if (!expr) return 0;
  const tokens = tokenize(expr);
  let i = 0;

  const peek = () => tokens[i];
  const consume = () => tokens[i++];

  function parsePrimary(): number {
    const t = consume();
    if (t === undefined) throw new Error("Ekspresi tidak lengkap");
    if (t === "(") {
      const v = parseComparison();
      if (consume() !== ")") throw new Error("Kurung tidak seimbang");
      return v;
    }
    if (t === "-") return -parsePrimary();
    if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
    if (ALLOWED_VARS.has(t) || t in ctx) {
      const v = ctx[t];
      if (v === undefined || Number.isNaN(v)) return 0;
      return Number(v);
    }
    throw new Error(`Variabel tidak diizinkan: ${t}`);
  }

  function parseMul(): number {
    let v = parsePrimary();
    while (peek() === "*" || peek() === "/") {
      const op = consume();
      const r = parsePrimary();
      v = op === "*" ? v * r : r === 0 ? 0 : v / r;
    }
    return v;
  }

  function parseAdd(): number {
    let v = parseMul();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const r = parseMul();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  function parseComparison(): number {
    const v = parseAdd();
    const op = peek();
    if (op && ["<", ">", "<=", ">=", "==", "!="].includes(op)) {
      consume();
      const r = parseAdd();
      switch (op) {
        case "<":
          return v < r ? 1 : 0;
        case ">":
          return v > r ? 1 : 0;
        case "<=":
          return v <= r ? 1 : 0;
        case ">=":
          return v >= r ? 1 : 0;
        case "==":
          return v === r ? 1 : 0;
        case "!=":
          return v !== r ? 1 : 0;
      }
    }
    return v;
  }

  const result = parseComparison();
  if (i < tokens.length) throw new Error("Ekspresi tidak valid");
  if (!Number.isFinite(result)) return 0;
  return result;
}

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
