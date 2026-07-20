/**
 * Account Receivable / funding presentation formulas for the executive dashboard.
 *
 * ProQPay domain (do not invert):
 * - SELF_FUNDED = client-funded payroll (client bank is transfer source)
 * - WORKING_CAPITAL = ProQPay/facility funded before client settlement
 *
 * No ClientInvoice model exists — AR uses operational proxies only.
 */

export type FundingModel = "SELF_FUNDED" | "WORKING_CAPITAL" | string;

export type PeriodFundingInput = {
  id: string;
  name: string;
  status: string;
  fundingModel: FundingModel;
  totalNet: number;
  companyId: string;
  companyName: string;
  clientType: string | null;
  payDate?: Date | string | null;
};

export type WcRequestInput = {
  id: string;
  payrollPeriodId: string;
  periodName: string;
  companyId: string | null;
  companyName?: string | null;
  approvedAmount: number;
  repaidAmount: number;
  status: string;
  settlementStatus: string;
  dueDate: Date | string | null;
};

export type ReceivableItem = {
  id: string;
  client: string;
  period: string;
  periodId: string | null;
  payrollValue: number;
  fundingSource: "Client Funded" | "Working Capital";
  invoiceStatus: string;
  outstanding: number;
  dueDate: string | null;
  aging: string | null;
  href: string;
  isDraftRequirement: boolean;
};

export type ReceivablesSummary = {
  totalOutstanding: number;
  clientFunded: number;
  workingCapitalUsed: number;
  collected: number;
  overdue: number;
  draftFundingRequirement: number;
  agingBuckets: {
    current: number;
    d1_30: number;
    d31_60: number;
    d61_90: number;
    d90plus: number;
  };
  items: ReceivableItem[];
  limitations: string[];
};

const CLOSED_STATUSES = new Set(["CLOSED", "VERIFIED", "DISBURSED"]);
const DRAFT_STATUSES = new Set(["DRAFT", "WAITING", "APPROVED"]);

export function isClientFunded(model: FundingModel): boolean {
  return model === "SELF_FUNDED";
}

export function isWorkingCapitalFunded(model: FundingModel): boolean {
  return model === "WORKING_CAPITAL";
}

export function daysPastDue(
  due: Date | string | null | undefined,
  now = new Date(),
): number | null {
  if (!due) return null;
  const d = typeof due === "string" ? new Date(due) : due;
  if (Number.isNaN(d.getTime())) return null;
  const ms = now.getTime() - d.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function agingBucket(
  days: number | null,
): "Current" | "1–30 Days" | "31–60 Days" | "61–90 Days" | "90+ Days" | null {
  if (days == null) return null;
  if (days <= 0) return "Current";
  if (days <= 30) return "1–30 Days";
  if (days <= 60) return "31–60 Days";
  if (days <= 90) return "61–90 Days";
  return "90+ Days";
}

/**
 * Build receivables overview from periods + WC requests (no invoice table).
 */
export function buildReceivablesSummary(input: {
  periods: PeriodFundingInput[];
  wcRequests: WcRequestInput[];
  /** When set, filter items primarily to this period id for list context */
  selectedPeriodId?: string | null;
  routes: {
    payrollDetail: (id: string) => string;
    workingCapital: () => string;
    payrollList: (q?: { funding?: string; status?: string }) => string;
  };
  now?: Date;
}): ReceivablesSummary {
  const now = input.now ?? new Date();
  const limitations = [
    "No ClientInvoice / AR ledger table — outstanding uses WorkingCapitalRequest settlement proxy.",
    "SELF_FUNDED means client-funded (client bank), not ProQPay treasury.",
    "Collected uses CLOSED SELF_FUNDED totals as settlement proxy when invoices are absent.",
    "DRAFT periods never count as outstanding AR — shown as draft funding requirement only.",
  ];

  const existing = input.periods.filter(
    (p) => p.clientType === "EXISTING" || p.clientType == null,
  );

  const clientFunded = existing
    .filter((p) => CLOSED_STATUSES.has(p.status) && isClientFunded(p.fundingModel))
    .reduce((s, p) => s + p.totalNet, 0);

  const workingCapitalFromPeriods = existing
    .filter(
      (p) =>
        CLOSED_STATUSES.has(p.status) && isWorkingCapitalFunded(p.fundingModel),
    )
    .reduce((s, p) => s + p.totalNet, 0);

  // Outstanding WC = approved − repaid where not fully settled/repaid
  let workingCapitalOutstanding = 0;
  let overdue = 0;
  const agingBuckets = {
    current: 0,
    d1_30: 0,
    d31_60: 0,
    d61_90: 0,
    d90plus: 0,
  };

  const items: ReceivableItem[] = [];

  for (const wc of input.wcRequests) {
    const settled =
      wc.settlementStatus === "COMPLETE" || wc.status === "REPAID";
    if (settled) continue;
    const out = Math.max(0, wc.approvedAmount - wc.repaidAmount);
    if (out <= 0) continue;
    workingCapitalOutstanding += out;
    const days = daysPastDue(wc.dueDate, now);
    const bucket = agingBucket(days);
    if (days != null && days > 0) overdue += out;
    if (bucket === "Current") agingBuckets.current += out;
    else if (bucket === "1–30 Days") agingBuckets.d1_30 += out;
    else if (bucket === "31–60 Days") agingBuckets.d31_60 += out;
    else if (bucket === "61–90 Days") agingBuckets.d61_90 += out;
    else if (bucket === "90+ Days") agingBuckets.d90plus += out;

    items.push({
      id: wc.id,
      client: wc.companyName ?? "Client",
      period: wc.periodName,
      periodId: wc.payrollPeriodId,
      payrollValue: wc.approvedAmount,
      fundingSource: "Working Capital",
      invoiceStatus: wc.settlementStatus.replaceAll("_", " "),
      outstanding: out,
      dueDate: wc.dueDate
        ? new Date(wc.dueDate).toISOString().slice(0, 10)
        : null,
      aging: bucket,
      href: input.routes.workingCapital(),
      isDraftRequirement: false,
    });
  }

  // WC used: prefer WC request approved outstanding + closed WC periods
  const workingCapitalUsed = Math.max(
    workingCapitalFromPeriods,
    workingCapitalOutstanding,
  );

  const draftFundingRequirement = existing
    .filter((p) => DRAFT_STATUSES.has(p.status))
    .reduce((s, p) => s + p.totalNet, 0);

  // Draft rows as expected funding (not AR)
  for (const p of existing.filter((x) => DRAFT_STATUSES.has(x.status))) {
    if (
      input.selectedPeriodId &&
      input.selectedPeriodId !== "ALL" &&
      p.id !== input.selectedPeriodId
    ) {
      // still include selected only for list density? include all drafts in items for transparency
    }
    items.push({
      id: `draft-${p.id}`,
      client: p.companyName,
      period: p.name,
      periodId: p.id,
      payrollValue: p.totalNet,
      fundingSource: isWorkingCapitalFunded(p.fundingModel)
        ? "Working Capital"
        : "Client Funded",
      invoiceStatus: "Draft — not receivable",
      outstanding: 0,
      dueDate: null,
      aging: null,
      href: input.routes.payrollDetail(p.id),
      isDraftRequirement: true,
    });
  }

  // Client-funded closed periods as collected rows (zero outstanding)
  for (const p of existing.filter(
    (x) => CLOSED_STATUSES.has(x.status) && isClientFunded(x.fundingModel),
  )) {
    items.push({
      id: `cf-${p.id}`,
      client: p.companyName,
      period: p.name,
      periodId: p.id,
      payrollValue: p.totalNet,
      fundingSource: "Client Funded",
      invoiceStatus: "Settled (proxy)",
      outstanding: 0,
      dueDate: null,
      aging: null,
      href: input.routes.payrollDetail(p.id),
      isDraftRequirement: false,
    });
  }

  // Sort: outstanding first, then draft, then settled
  items.sort((a, b) => {
    if (a.outstanding !== b.outstanding) return b.outstanding - a.outstanding;
    if (a.isDraftRequirement !== b.isDraftRequirement)
      return a.isDraftRequirement ? -1 : 1;
    return 0;
  });

  return {
    totalOutstanding: workingCapitalOutstanding,
    clientFunded,
    workingCapitalUsed,
    collected: clientFunded,
    overdue,
    draftFundingRequirement,
    agingBuckets,
    items,
    limitations,
  };
}
