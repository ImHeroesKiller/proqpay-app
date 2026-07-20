/**
 * Executive Command Center presentation model.
 * Realistic multinational-scale figures for boardroom decision support.
 * Separate from operational tenant KPIs in loadDashboardBundle.
 */

export type ExecKpi = {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "neutral";
  hint: string;
};

export type CountryVolume = {
  code: string;
  name: string;
  volumeIdrBn: number;
  employees: number;
  x: number;
  y: number;
};

export type CycleStage = {
  id: string;
  label: string;
  pct: number;
  count: number;
};

export type Insight = {
  id: string;
  tone: "success" | "info" | "warning" | "danger";
  title: string;
  body: string;
  time: string;
};

export type PayrollCycleRow = {
  id: string;
  period: string;
  client: string;
  country: string;
  employees: number;
  payroll: string;
  funding: string;
  status: "Draft" | "Review" | "Approved" | "Funding" | "Completed";
  approver: string;
  completion: string;
};

export type AlertItem = {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  entity: string;
  detail: string;
  eta: string;
};

export type ActivityItem = {
  id: string;
  kind: "approval" | "client" | "funding" | "audit" | "ai";
  title: string;
  meta: string;
  time: string;
};

export type FooterMetric = {
  id: string;
  title: string;
  items: { label: string; value: string }[];
};

export const EXEC_KPIS: ExecKpi[] = [
  {
    id: "volume",
    label: "Monthly Payroll Volume",
    value: "IDR 738 Bn",
    delta: "+4.2% vs prior month",
    trend: "up",
    hint: "Gross disbursed across active cycles",
  },
  {
    id: "paid",
    label: "Employees Paid",
    value: "12,846",
    delta: "+318 MoM",
    trend: "up",
    hint: "Successful net pay completions",
  },
  {
    id: "countries",
    label: "Countries",
    value: "18",
    delta: "Stable footprint",
    trend: "neutral",
    hint: "Jurisdictions with live payroll",
  },
  {
    id: "entities",
    label: "Business Entities",
    value: "46",
    delta: "+2 this quarter",
    trend: "up",
    hint: "Legal entities under payroll OS",
  },
  {
    id: "accuracy",
    label: "Payroll Accuracy",
    value: "99.93%",
    delta: "+0.04 pts",
    trend: "up",
    hint: "Post-audit line integrity",
  },
  {
    id: "compliance",
    label: "Compliance Score",
    value: "98.8%",
    delta: "Within board threshold",
    trend: "neutral",
    hint: "Regulatory & policy adherence",
  },
  {
    id: "cycle",
    label: "Avg. Processing Time",
    value: "2.1 Days",
    delta: "−0.3 days QoQ",
    trend: "up",
    hint: "Draft to completed median",
  },
  {
    id: "funding",
    label: "Funding Coverage",
    value: "100%",
    delta: "Fully reserved",
    trend: "up",
    hint: "Client + working capital cover",
  },
];

export const COUNTRY_VOLUMES: CountryVolume[] = [
  { code: "ID", name: "Indonesia", volumeIdrBn: 312, employees: 4820, x: 78, y: 58 },
  { code: "SG", name: "Singapore", volumeIdrBn: 98, employees: 1240, x: 76, y: 56 },
  { code: "AU", name: "Australia", volumeIdrBn: 86, employees: 980, x: 86, y: 72 },
  { code: "MY", name: "Malaysia", volumeIdrBn: 64, employees: 1120, x: 75, y: 54 },
  { code: "PH", name: "Philippines", volumeIdrBn: 52, employees: 1460, x: 80, y: 50 },
  { code: "VN", name: "Vietnam", volumeIdrBn: 41, employees: 890, x: 76, y: 48 },
  { code: "JP", name: "Japan", volumeIdrBn: 38, employees: 620, x: 84, y: 38 },
  { code: "GB", name: "United Kingdom", volumeIdrBn: 29, employees: 410, x: 48, y: 32 },
  { code: "US", name: "United States", volumeIdrBn: 12, employees: 186, x: 22, y: 40 },
  { code: "DE", name: "Germany", volumeIdrBn: 6, employees: 120, x: 52, y: 34 },
];

export const CYCLE_STAGES: CycleStage[] = [
  { id: "draft", label: "Draft", pct: 8, count: 3 },
  { id: "validation", label: "Validation", pct: 12, count: 5 },
  { id: "approval", label: "Approval", pct: 18, count: 7 },
  { id: "instruction", label: "Payment Instruction", pct: 14, count: 6 },
  { id: "funding", label: "Funding", pct: 11, count: 4 },
  { id: "disbursement", label: "Disbursement", pct: 16, count: 6 },
  { id: "completed", label: "Completed", pct: 72, count: 28 },
];

export const INSIGHTS: Insight[] = [
  {
    id: "i1",
    tone: "success",
    title: "Indonesia cycle closed cleanly",
    body: "August managed payroll for PT Anak Tiga Emas completed with 99.97% line accuracy and zero failed transfers.",
    time: "14 min ago",
  },
  {
    id: "i2",
    tone: "info",
    title: "Funding requirement rising next month",
    body: "Projected September volume +6.8% driven by Singapore headcount and Vietnam mid-cycle joiners.",
    time: "41 min ago",
  },
  {
    id: "i3",
    tone: "warning",
    title: "Approval approaching SLA",
    body: "Level-2 approval for Malaysia entity MY-OPS-04 is 6 hours from SLA breach.",
    time: "1h ago",
  },
  {
    id: "i4",
    tone: "danger",
    title: "Compliance document expires in 7 days",
    body: "Philippines DOLE payroll authorization for PH-CEB-02 expires 27 Aug — renewal workflow opened.",
    time: "2h ago",
  },
  {
    id: "i5",
    tone: "success",
    title: "Working capital utilization declining",
    body: "Facility drawdown at 41% (−9 pts QoQ) as more clients shift to self-funded transfer models.",
    time: "3h ago",
  },
];

export const TREND_12M = [
  { month: "Sep", volume: 612 },
  { month: "Oct", volume: 628 },
  { month: "Nov", volume: 641 },
  { month: "Dec", volume: 698 },
  { month: "Jan", volume: 655 },
  { month: "Feb", volume: 662 },
  { month: "Mar", volume: 679 },
  { month: "Apr", volume: 691 },
  { month: "May", volume: 704 },
  { month: "Jun", volume: 712 },
  { month: "Jul", volume: 708 },
  { month: "Aug", volume: 738 },
];

export const PAYROLL_BY_COUNTRY = [
  { name: "Indonesia", value: 312 },
  { name: "Singapore", value: 98 },
  { name: "Australia", value: 86 },
  { name: "Malaysia", value: 64 },
  { name: "Philippines", value: 52 },
  { name: "Vietnam", value: 41 },
  { name: "Japan", value: 38 },
  { name: "UK", value: 29 },
];

export const PAYROLL_BY_CLIENT = [
  { name: "PT Anak Tiga Emas", value: 148 },
  { name: "Nusantara Digital", value: 96 },
  { name: "Pacific Grid Ops", value: 84 },
  { name: "Asean Logistics Hub", value: 72 },
  { name: "Horizon Retail Group", value: 61 },
  { name: "Other active", value: 277 },
];

export const PAYROLL_BY_COST_CENTER = [
  { name: "Operations", value: 268 },
  { name: "Technology", value: 142 },
  { name: "Commercial", value: 98 },
  { name: "Finance", value: 76 },
  { name: "People", value: 64 },
  { name: "Shared Services", value: 90 },
];

export const PAYROLL_BY_BU = [
  { name: "Managed Payroll", value: 412 },
  { name: "Enterprise Ops", value: 168 },
  { name: "Regional Expansion", value: 94 },
  { name: "Internal MSG", value: 64 },
];

export const FUNDING_UTIL = [
  { month: "Mar", self: 78, wc: 22 },
  { month: "Apr", self: 80, wc: 20 },
  { month: "May", self: 82, wc: 18 },
  { month: "Jun", self: 84, wc: 16 },
  { month: "Jul", self: 87, wc: 13 },
  { month: "Aug", self: 89, wc: 11 },
];

export const APPROVAL_SLA = [
  { stage: "L1 HR", onTime: 96, late: 4 },
  { stage: "L2 Finance", onTime: 91, late: 9 },
  { stage: "L3 Director", onTime: 94, late: 6 },
];

export const PAYMENT_COMPLETION = [
  { day: "D0", rate: 42 },
  { day: "D1", rate: 71 },
  { day: "D2", rate: 89 },
  { day: "D3", rate: 96 },
  { day: "D4+", rate: 99.4 },
];

export const DISBURSEMENT_TIMELINE = [
  { slot: "00–04", batches: 2 },
  { slot: "04–08", batches: 8 },
  { slot: "08–12", batches: 24 },
  { slot: "12–16", batches: 31 },
  { slot: "16–20", batches: 18 },
  { slot: "20–24", batches: 6 },
];

export const RECENT_CYCLES: PayrollCycleRow[] = [
  {
    id: "c1",
    period: "Aug 2026",
    client: "PT Anak Tiga Emas",
    country: "Indonesia",
    employees: 1840,
    payroll: "IDR 148.2 Bn",
    funding: "Self-funded",
    status: "Completed",
    approver: "S. Rahayu",
    completion: "1.8 days",
  },
  {
    id: "c2",
    period: "Aug 2026",
    client: "Pacific Grid Ops",
    country: "Singapore",
    employees: 412,
    payroll: "IDR 42.6 Bn",
    funding: "Self-funded",
    status: "Funding",
    approver: "A. Wijaya",
    completion: "—",
  },
  {
    id: "c3",
    period: "Aug 2026",
    client: "Horizon Retail Group",
    country: "Malaysia",
    employees: 980,
    payroll: "IDR 38.1 Bn",
    funding: "Working capital",
    status: "Approved",
    approver: "R. Kusuma",
    completion: "—",
  },
  {
    id: "c4",
    period: "Aug 2026",
    client: "Mekong Services",
    country: "Vietnam",
    employees: 640,
    payroll: "IDR 21.4 Bn",
    funding: "Self-funded",
    status: "Review",
    approver: "Pending L2",
    completion: "—",
  },
  {
    id: "c5",
    period: "Jul 2026",
    client: "Nusantara Digital",
    country: "Indonesia",
    employees: 1260,
    payroll: "IDR 96.0 Bn",
    funding: "Self-funded",
    status: "Completed",
    approver: "B. Santoso",
    completion: "2.0 days",
  },
  {
    id: "c6",
    period: "Aug 2026",
    client: "Asean Logistics Hub",
    country: "Philippines",
    employees: 720,
    payroll: "IDR 28.7 Bn",
    funding: "Self-funded",
    status: "Draft",
    approver: "—",
    completion: "—",
  },
];

export const OPERATIONAL_ALERTS: AlertItem[] = [
  {
    id: "a1",
    type: "Late Approval",
    severity: "high",
    entity: "MY-OPS-04",
    detail: "Level-2 finance approval overdue risk",
    eta: "SLA 6h",
  },
  {
    id: "a2",
    type: "Funding Required",
    severity: "medium",
    entity: "SG-PGO-08",
    detail: "Client transfer window opens tomorrow 09:00 SGT",
    eta: "T-18h",
  },
  {
    id: "a3",
    type: "Compliance Expiry",
    severity: "critical",
    entity: "PH-CEB-02",
    detail: "Regulatory authorization expires in 7 days",
    eta: "7 days",
  },
  {
    id: "a4",
    type: "Payment Delay",
    severity: "medium",
    entity: "AU-HRT-11",
    detail: "Two instruction items held for bank validation",
    eta: "In review",
  },
  {
    id: "a5",
    type: "Missing Employee Data",
    severity: "low",
    entity: "VN-MSK-03",
    detail: "14 joiners missing tax residency flags",
    eta: "Before cut-off",
  },
  {
    id: "a6",
    type: "Upcoming Payroll",
    severity: "low",
    entity: "ID-ATE-01",
    detail: "September cycle opens in 4 business days",
    eta: "4 days",
  },
];

export const ACTIVITY_FEED: ActivityItem[] = [
  {
    id: "f1",
    kind: "approval",
    title: "Director approved Indonesia August close",
    meta: "PT Anak Tiga Emas · Level 3",
    time: "09:42",
  },
  {
    id: "f2",
    kind: "funding",
    title: "Working capital facility rebalanced",
    meta: "Facility MSG-WC-A · drawdown 41%",
    time: "09:18",
  },
  {
    id: "f3",
    kind: "client",
    title: "Pacific Grid Ops submitted transfer proof",
    meta: "SGD 4.12M · under verification",
    time: "08:55",
  },
  {
    id: "f4",
    kind: "audit",
    title: "Audit trail sealed for July closed periods",
    meta: "28 periods · immutable hash set",
    time: "08:20",
  },
  {
    id: "f5",
    kind: "ai",
    title: "Recommendation: advance L2 SLA routing",
    meta: "Malaysia queue density elevated",
    time: "07:48",
  },
  {
    id: "f6",
    kind: "approval",
    title: "Finance cleared Horizon Retail Group",
    meta: "Malaysia · Level 2 complete",
    time: "07:12",
  },
];

export const FOOTER_WIDGETS: FooterMetric[] = [
  {
    id: "top-clients",
    title: "Top Performing Clients",
    items: [
      { label: "PT Anak Tiga Emas", value: "99.98% accuracy" },
      { label: "Nusantara Digital", value: "1.6d cycle time" },
      { label: "Pacific Grid Ops", value: "Zero failed transfers" },
    ],
  },
  {
    id: "calendar",
    title: "Payroll Calendar",
    items: [
      { label: "25 Aug", value: "ID cut-off ATE" },
      { label: "27 Aug", value: "SG funding window" },
      { label: "29 Aug", value: "MY disbursement" },
    ],
  },
  {
    id: "deadlines",
    title: "Upcoming Deadlines",
    items: [
      { label: "PH compliance", value: "27 Aug" },
      { label: "VN tax filing pack", value: "30 Aug" },
      { label: "AU super guarantee", value: "01 Sep" },
    ],
  },
  {
    id: "funding",
    title: "Funding Summary",
    items: [
      { label: "Self-funded", value: "IDR 657 Bn" },
      { label: "Working capital", value: "IDR 81 Bn" },
      { label: "Coverage", value: "100%" },
    ],
  },
  {
    id: "cash",
    title: "Cash Position",
    items: [
      { label: "Client escrow readiness", value: "Strong" },
      { label: "Facility headroom", value: "IDR 190 Bn" },
      { label: "Settlement pending", value: "IDR 12.4 Bn" },
    ],
  },
];

export const FILTER_OPTIONS = {
  regions: ["Global View", "ASEAN", "APAC", "EMEA", "Americas"],
  countries: [
    "All countries",
    "Indonesia",
    "Singapore",
    "Australia",
    "Malaysia",
    "Philippines",
    "Vietnam",
    "Japan",
    "United Kingdom",
  ],
  businessUnits: [
    "All business units",
    "Managed Payroll",
    "Enterprise Ops",
    "Regional Expansion",
    "Internal MSG",
  ],
  cycles: ["Aug 2026", "Jul 2026", "Jun 2026", "YTD 2026"],
  currencies: ["IDR", "SGD", "USD", "AUD", "MYR"],
  clients: [
    "All clients",
    "PT Anak Tiga Emas",
    "Nusantara Digital",
    "Pacific Grid Ops",
    "Horizon Retail Group",
  ],
};
