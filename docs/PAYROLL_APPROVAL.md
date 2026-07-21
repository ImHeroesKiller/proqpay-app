# Approval Engine

Configurable chain on `PayrollApproval` / `PayrollApprovalStep`.

Default levels: Payroll Officer → Payroll Manager → Finance Manager → Director.

Actions: APPROVE | REJECT | REQUEST_REVISION | COMMENT

Prior levels must be APPROVED before next step acts.

API: `GET/POST /api/payroll/approval`
