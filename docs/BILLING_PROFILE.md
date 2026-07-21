# Client Billing Profile

`ClientBillingProfile` on Company:

- billingMethod, topDays (7/14/30/45/60/custom), invoiceGrouping (PER_PAYROLL/PROJECT/SITE/CONSOLIDATED)
- invoicePrefix, currency, taxConfiguration

Used by Phase 1C Generate Invoice (not auto-created on payroll close).

Service: `lib/payroll-engine/billing-profile-service.ts`
