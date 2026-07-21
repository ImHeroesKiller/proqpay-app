/** Static product metadata that does not live in the database. */

/** Shared operator password used only by seed scripts (never display in production UI). */
export const DEMO_PASSWORD = "ProQPay2026!";

/** Operator login emails preserved across reseed. Password comes from seed/env — not shown in UI. */
export const DEMO_ACCOUNTS = [
  { email: "siti.rahayu@msg-os.com", role: "PAYROLL_ADMIN" },
  { email: "budi.santoso@msg-os.com", role: "FINANCE" },
  { email: "andi.wijaya@msg-os.com", role: "DIRECTOR" },
  { email: "dewi.lestari@msg-os.com", role: "HR" },
  { email: "admin@msg-os.com", role: "SUPER_ADMIN" },
] as const;

export const departments = [
  "Operations",
  "Finance",
  "Engineering",
  "HR",
  "Logistics",
  "Admin",
  "IT",
  "Sales",
];

export const banks = [
  "BCA",
  "Mandiri",
  "BNI",
  "BRI",
  "CIMB Niaga",
  "Permata",
  "Danamon",
];

export const comingSoonModules = [
  {
    title: "Tax Engine",
    description: "Automated PPh 21 calculation and filing support.",
  },
  {
    title: "BPJS Module",
    description: "Social security calculation and administration workflows.",
  },
  {
    title: "Employee Self-Service",
    description: "Payslips, leave requests, and profile updates for employees.",
  },
  {
    title: "Open API",
    description: "Programmatic access for ERP, banking, and HR integrations.",
  },
  {
    title: "AI Payroll Assistant",
    description: "Anomaly detection and exception triage with human approval.",
  },
  {
    title: "HRIS Core",
    description: "Optional HR modules beyond the payroll operating system.",
  },
];
