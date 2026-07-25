import { z } from "zod";

export const schemeComponentSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  kind: z.enum(["EARNING", "DEDUCTION", "EMPLOYER_COST", "INFO"]),
  method: z.enum([
    "FIXED",
    "QUANTITY_RATE",
    "PERCENT_OF_BASIC",
    "PERCENT_OF_GROSS",
    "FORMULA",
    "ATTENDANCE_BASED",
  ]),
  amount: z.number().nonnegative().optional(),
  rate: z.number().nonnegative().optional(),
  percent: z.number().min(0).max(100).optional(),
  quantitySource: z
    .enum(["PRESENT_DAYS", "WORK_DAYS", "OVERTIME_HOURS", "ABSENT_DAYS", "FIXED"])
    .optional(),
  formula: z.string().max(500).optional(),
  taxable: z.boolean().default(true),
  bpjsApplicable: z.boolean().default(false),
  proratable: z.boolean().default(false),
});

export const schemeDslSchema = z.object({
  schemeName: z.string().min(1).max(200),
  currency: z.literal("IDR").default("IDR"),
  workerType: z.enum([
    "MONTHLY",
    "DAILY",
    "WEEKLY",
    "SHIFT",
    "OUTPUT",
    "COMMISSION",
  ]),
  components: z.array(schemeComponentSchema).min(1).max(50),
  taxPolicy: z
    .object({
      method: z.enum(["GROSS", "NET", "GROSS_UP"]).default("GROSS"),
    })
    .default({ method: "GROSS" }),
  bpjsPolicy: z
    .object({
      enabled: z.boolean().default(true),
      method: z.enum(["STANDARD", "NONE"]).default("STANDARD"),
    })
    .default({ enabled: true, method: "STANDARD" }),
  rounding: z.enum(["NEAREST", "UP", "DOWN"]).default("NEAREST"),
  managementFeePercent: z.number().min(0).max(100).optional(),
  effectiveDate: z.string().optional(),
  assumptions: z.array(z.string()).default([]),
});

export type SchemeDsl = z.infer<typeof schemeDslSchema>;
export type SchemeComponent = z.infer<typeof schemeComponentSchema>;

export function parseSchemeDsl(input: unknown): {
  ok: true;
  data: SchemeDsl;
} | { ok: false; errors: string[] } {
  const result = schemeDslSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`,
      ),
    };
  }
  return { ok: true, data: result.data };
}

/** Extract first JSON object from AI text. */
export function extractJsonObject(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
