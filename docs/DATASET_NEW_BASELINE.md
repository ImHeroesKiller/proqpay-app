# Dataset New Baseline — 2026

## Clients

| Name | Type | Lifecycle | Code / notes |
|------|------|-----------|--------------|
| PT Anak Tiga Emas | EXISTING | ACTIVE | ATE — managed payroll |
| PT Mitra Langgeng Sejati | PROSPECT | PROSPECT | MLS — pipeline only |
| PT Qjob Saka Gemilang | PROSPECT | PROSPECT | QSG — pipeline only |
| PT Oversea Global Group | PROSPECT | PROSPECT | OGG — pipeline only |
| ProQPay Internal Operations | INTERNAL | ACTIVE | Internal MSG headcount |

## Projects

| Code | Name | Company | Status |
|------|------|---------|--------|
| ATE-MPS-2026 | Managed Payroll Services – PT Anak Tiga Emas | ATE | ACTIVE |
| INT-PQP-2026 | Internal Payroll – ProQPay Operations | Internal | ACTIVE |
| MLS-PMS-2026 | Payroll Managed Service – Mitra Langgeng Sejati | MLS | DRAFT |
| QSG-EPO-2026 | Enterprise Payroll Operation – Qjob Saka Gemilang | QSG | DRAFT |
| OGG-PA-2026 | Payroll Administration – Oversea Global Group | OGG | DRAFT |

## Employees

| Scope | Count | Notes |
|-------|------:|-------|
| ATE profiles | 36 | Mix permanent/contract/probation/resigned |
| ATE June payroll headcount | 34 | Active on June period |
| ATE July payroll headcount | 30 | Resigned June-only removed; 2 July joiners |
| Internal | 18 | ProQPay/MSG operations |

## Payroll periods

| Period | Company | Status | totalNet (Dashboard field) |
|--------|---------|--------|----------------------------:|
| Juni 2026 | ATE | CLOSED | Rp407.000.000 |
| Juli 2026 | ATE | CLOSED | Rp331.000.000 |
| Agustus 2026 | ATE | DRAFT | Rp350.000.000 (not historical paid) |
| Internal Juni 2026 | Internal | CLOSED | Rp255.000.000 (excluded from client KPIs) |
| Internal Juli 2026 | Internal | CLOSED | Rp260.000.000 (excluded from client KPIs) |

**Field mapping:** Dashboard / reports “Total Payroll” = `PayrollPeriod.totalNet`.  
Line-level `netPay` sums match period `totalNet` exactly.

## Sales opportunities (OPEN)

| Prospect | Stage | Estimated payroll | Probability | Weighted |
|----------|-------|------------------:|------------:|---------:|
| PT Mitra Langgeng Sejati | NEGOTIATION | Rp2.000.000.000 | 65% | Rp1.300.000.000 |
| PT Qjob Saka Gemilang | PROPOSAL | Rp2.000.000.000 | 50% | Rp1.000.000.000 |
| PT Oversea Global Group | QUALIFIED | Rp200.000.000 | 30% | Rp60.000.000 |
| **Total estimated pipeline** | | **Rp4.200.000.000** | | |

Prospects have **no** CLOSED/VERIFIED/DISBURSED payroll periods.

## Workflow (ATE June & July CLOSED)

Each completed ATE period includes:

1. Multilevel approvals (3 levels, APPROVED)
2. Payment instruction EXECUTED + SUCCESS items
3. Payment confirmation VERIFIED
4. Disbursement batch PAID
5. Audit `PAYROLL_CLOSED`

Funding model: **SELF_FUNDED** (client bank → employees).

## Operators

| Email | Role | companyId binding |
|-------|------|-------------------|
| admin@msg-os.com | SUPER_ADMIN | null (org-wide) |
| andi.wijaya@msg-os.com | DIRECTOR | null |
| siti.rahayu@msg-os.com | PAYROLL_ADMIN | ATE |
| budi.santoso@msg-os.com | FINANCE | ATE |
| rina.kusuma@msg-os.com | APPROVER | ATE |
| dewi.lestari@msg-os.com | HR | Internal |
