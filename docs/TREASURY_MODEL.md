# Treasury Model

## Entities

- **TreasuryAccount** — org (optional company) cash book  
- **CashMovement** — immutable IN/OUT/TRANSFER/PAYROLL/COLLECTION/EXPENSE  

## Rules

- Amount must be positive  
- Movements are append-only (no update of historical amounts in service)  
- Collection movements can link `clientPaymentId` on payment verify  

## Access

Module `treasury` — SUPER_ADMIN, DIRECTOR, FINANCE, FINANCE_MANAGER only (not CLIENT / VIEWER / operator).

## HTTP

`GET/POST /api/financial/treasury`
