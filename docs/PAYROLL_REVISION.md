# Revision Model

Payroll calculations are never silently overwritten.

`PayrollRevision` stores:

- revisionNumber, reason, baseRevision, snapshotJson, createdBy

Calculation status becomes REVISED; revision increments.

API: `GET/POST /api/payroll/revisions`
