# API Endpoints Documentation

## Overview

- **Total Endpoints:** 59
- **Authentication:** JWT Auth (JwtAuthGuard) required on all endpoints
- **Soft-Delete Pattern:** `deleted_at`, `deleted_by` fields set on row; queries always filter `deleted_at: null`
- **User Injection:** `@CurrentUser() user: AuthUser` parameter injects the authenticated user; `user.id` passed to service layer for audit
- **RBAC:** `RequirePermissions()` decorators are defined but currently commented out at controller level
- **Cash-Box Mutations:** Additionally require `CashBoxAccessGuard`; session-state routes require `CashBoxSessionGuard`

---

## 1. Payments Controller

**File:** `src/modules/erp/payments/payments.controller.ts`  
**Base Path:** `api/erp/payments`

| # | Method | Full Route | Body / Params | Description |
|---|--------|-----------|---------------|-------------|
| 1 | POST | `/erp/payments` | `CreatePaymentDto` — `type` (PAYMENT\|COLLECTION), `date`, `party_id?`, `party_type?`, `payment_method` (CASH\|CHECK\|BANK_TRANSFER\|CREDIT_CARD\|DEBIT_CARD\|VIRTUAL_WALLET), `amount`, `currency_code`, `exchange_rate?`, `rate_type?`, `converted_amount?`, `exchange_note?`, `description?`, `reference?`, `bank_account_id?`, `cash_box_id?`, `documents?` (array of `{document_id, amount_applied}`), `status?` | Creates a new payment (incoming or outgoing). |
| 2 | GET | `/erp/payments` | Query: `party_id?`, `type?`, `payment_method?`, `status?` | Lists all payments, optionally filtered by party, type, method, or status. |
| 3 | GET | `/erp/payments/:id` | Param: `id` | Gets a single payment by ID. |
| 4 | PATCH | `/erp/payments/:id` | Param: `id` + `UpdatePaymentDto` — `date?`, `party_id?`, `party_type?`, `payment_method?`, `amount?`, `currency_code?`, `exchange_rate?`, `rate_type?`, `converted_amount?`, `exchange_note?`, `description?`, `reference?`, `bank_account_id?`, `cash_box_id?`, `documents?` | Updates an existing payment. |
| 5 | DELETE | `/erp/payments/:id` | Param: `id` | Soft-deletes a payment. |
| 6 | POST | `/erp/payments/:id/reverse` | Param: `id` | Reverses a payment (creates the inverse movement). |

---

## 2. Checks Controller

**File:** `src/modules/erp/checks/checks.controller.ts`  
**Base Path:** `api/erp/checks`

| # | Method | Full Route | Body / Params | Description |
|---|--------|-----------|---------------|-------------|
| 1 | POST | `/erp/checks` | `CreateCheckDto` — `payment_id?`, `bank_account_id?`, `check_number`, `bank_name`, `bank_branch?`, `account_number?`, `issuer_name`, `issuer_id?`, `amount`, `currency_code`, `issue_date`, `due_date`, `is_own?`, `notes?`, `payment_date?`, `party_id?`, `party_type?` | Creates a new check record. |
| 2 | GET | `/erp/checks` | Query: `status?`, `is_own?` (true/false string), `bank_name?`, `due_before?` | Lists all checks with optional filters. |
| 3 | GET | `/erp/checks/upcoming` | Query: `days?` (defaults to 7) | Lists checks due within the specified number of days. |
| 4 | GET | `/erp/checks/pending-notification` | None | Lists checks that need notification (pending action). |
| 5 | GET | `/erp/checks/:id` | Param: `id` | Gets a single check by ID. |
| 6 | PATCH | `/erp/checks/:id` | Param: `id` + `UpdateCheckDto` — `bank_name?`, `bank_branch?`, `account_number?`, `issuer_name?`, `issuer_id?`, `due_date?`, `status?` (PENDING\|CLEARED\|BOUNCED\|CANCELLED), `notes?`, `payment_date?`, `deposit_date?`, `clearing_date?` | Updates an existing check record. |
| 7 | PATCH | `/erp/checks/:id/clear` | Param: `id` | Marks a check as cleared (cash deposited/processed). |
| 8 | PATCH | `/erp/checks/:id/bounce` | Param: `id` | Marks a check as bounced. |
| 9 | PATCH | `/erp/checks/:id/confirm` | Param: `id` | Confirms a check (e.g., acknowledges receipt). |
| 10 | PATCH | `/erp/checks/:id/reject` | Param: `id` | Rejects a check. |
| 11 | DELETE | `/erp/checks/:id` | Param: `id` | Soft-deletes a check record. |

---

## 3. Current Accounts Controller

**File:** `src/modules/erp/current-accounts/current-accounts.controller.ts`  
**Base Path:** `api/erp/current-accounts`

| # | Method | Full Route | Body / Params | Description |
|---|--------|-----------|---------------|-------------|
| 1 | POST | `/erp/current-accounts/entries` | `CreateCurrentAccountEntryDto` — `party_id`, `party_type`, `currency_code`, `type` (PAYMENT\|COLLECTION\|ADVANCE\|LOAN\|LOAN_PAYMENT\|ADJUSTMENT\|TRANSFER\|CHECK_ISSUED\|CHECK_RECEIVED), `amount`, `exchange_rate?`, `description?`, `reference_type?`, `reference_id?`, `payment_id?`, `date?` | Adds a new entry (debit/credit) to a party's current account. |
| 2 | GET | `/erp/current-accounts/party/:partyId` | Param: `partyId` | Gets the current account summary for a specific party. |
| 3 | GET | `/erp/current-accounts/party/:partyId/entries` | Param: `partyId`, Query: `currency_code?` | Lists all entries for a party's current account, optionally filtered by currency. |
| 4 | GET | `/erp/current-accounts/party/:partyId/statement` | Param: `partyId`, Query: `currency_code` (required) | Generates a statement for the party's current account in the specified currency. |
| 5 | GET | `/erp/current-accounts/party/:partyId/balance` | Param: `partyId`, Query: `currency_code` (required) | Gets the outstanding balance for a party's current account in the specified currency. |

---

## 4. Bank Accounts Controller

**File:** `src/modules/erp/bank-accounts/bank-accounts.controller.ts`  
**Base Path:** `api/erp/bank-accounts`

| # | Method | Full Route | Body / Params | Description |
|---|--------|-----------|---------------|-------------|
| 1 | POST | `/erp/bank-accounts` | `CreateBankAccountDto` — `name`, `bank_name`, `account_type`, `cbu?`, `alias?`, `account_number?`, `currency_code`, `balance?`, `active?` | Creates a new bank account. |
| 2 | GET | `/erp/bank-accounts` | None | Lists all bank accounts. |
| 3 | GET | `/erp/bank-accounts/:id` | Param: `id` | Gets a single bank account by ID. |
| 4 | PATCH | `/erp/bank-accounts/:id` | Param: `id` + `UpdateBankAccountDto` — `name?`, `bank_name?`, `account_type?`, `cbu?`, `alias?`, `account_number?`, `currency_code?`, `balance?`, `active?` | Updates an existing bank account. |
| 5 | DELETE | `/erp/bank-accounts/:id` | Param: `id` | Soft-deletes a bank account. |
| 6 | GET | `/erp/bank-accounts/:id/movements` | Param: `id` | Lists all movements (inflows/outflows) for a bank account. |

---

## 5. Treasury Reports Controller

**File:** `src/modules/erp/treasury-reports/treasury-reports.controller.ts`  
**Base Path:** `api/erp/treasury`

| # | Method | Full Route | Body / Params | Description |
|---|--------|-----------|---------------|-------------|
| 1 | GET | `/erp/treasury/dashboard` | None | Returns treasury dashboard summary (totals, balances, etc.). |
| 2 | GET | `/erp/treasury/movements` | Query: `type?`, `date_from?`, `date_to?`, `limit?` | Lists treasury movements with optional type/date/limit filters. |

---

## 6. Cash Boxes Controller

**File:** `src/modules/logistica/cash-boxes/cash-boxes.controller.ts`  
**Base Path:** `api/logistica/cash-boxes`

| # | Method | Full Route | Body / Params | Description |
|---|--------|-----------|---------------|-------------|
| 1 | POST | `/logistica/cash-boxes` | `CreateCashBoxDto` — `name`, `type?` (MAIN\|FIXED\|REGISTER), `responsible_id?`, `opening_balance?`, `max_limit?`, `active?`, `is_main?` | Creates a new cash box. |
| 2 | GET | `/logistica/cash-boxes` | None | Lists all cash boxes. |
| 3 | GET | `/logistica/cash-boxes/main` | None | Gets the main/default cash box. |
| 4 | GET | `/logistica/cash-boxes/:id` | Param: `id` | Gets a single cash box by ID. |
| 5 | PATCH | `/logistica/cash-boxes/:id` | Param: `id` + `UpdateCashBoxDto` (same as Create, all optional) — `name?`, `type?`, `responsible_id?`, `opening_balance?`, `max_limit?`, `active?`, `is_main?` | Updates a cash box. |
| 6 | DELETE | `/logistica/cash-boxes/:id` | Param: `id` | Soft-deletes a cash box. |
| 7 | GET | `/logistica/cash-boxes/:id/balances` | Param: `id` | Gets the current balances for a cash box (by currency). |
| 8 | POST | `/logistica/cash-boxes/:id/open` | Param: `id` + `OpenSessionDto` — `opening_balance`, `notes?` | Opens a new session on a cash box with a given opening balance. |
| 9 | POST | `/logistica/cash-boxes/:id/close` | Param: `id` + `CloseSessionDto` — `actual_balance`, `notes?` | Closes the active session with the counted actual balance. |
| 10 | POST | `/logistica/cash-boxes/:id/force-close` | Param: `id` + `ForceCloseSessionDto` — `actual_balance`, `reason` | Force-closes the active session with a mandatory reason (override). |
| 11 | GET | `/logistica/cash-boxes/:id/session` | Param: `id` | Gets the currently active (open) session for a cash box. |
| 12 | GET | `/logistica/cash-boxes/:id/sessions` | Param: `id` | Lists all session history (open/close log) for a cash box. |

---

## 7. Cash Box Movements Controller

**File:** `src/modules/logistica/cash-box-movements/cash-box-movements.controller.ts`  
**Base Path:** `api/logistica/cash-box-movements`

| # | Method | Full Route | Body / Params | Description |
|---|--------|-----------|---------------|-------------|
| 1 | POST | `/logistica/cash-box-movements` | `CreateCashBoxMovementDto` — `cash_box_id`, `session_id?`, `employee_id?`, `type` (PAYMENT\|COLLECTION\|ADVANCE\|LOAN\|LOAN_PAYMENT\|ADJUSTMENT\|TRANSFER\|CHECK_ISSUED\|CHECK_RECEIVED), `amount`, `currency_code`, `exchange_rate?`, `description?`, `reference_type?`, `reference_id?`, `payment_id?`, `bank_account_id?`, `date?` | Creates a new movement in a cash box (requires active session). |
| 2 | GET | `/logistica/cash-box-movements` | Query (via `FilterCashBoxMovementDto`): `cash_box_id?`, `session_id?`, `employee_id?`, `type?`, `currency_code?`, `date_from?`, `date_to?` | Lists movements with optional filters. |
| 3 | GET | `/logistica/cash-box-movements/:id` | Param: `id` | Gets a single movement by ID. |
| 4 | PATCH | `/logistica/cash-box-movements/:id` | Param: `id` + `UpdateCashBoxMovementDto` — `description?`, `reference_type?`, `reference_id?`, `payment_id?` | Updates mutable fields of a movement. |
| 5 | DELETE | `/logistica/cash-box-movements/:id` | Param: `id` | Soft-deletes a cash box movement. |

---

## 8. Cash Box Renditions Controller

**File:** `src/modules/logistica/cash-box-renditions/cash-box-renditions.controller.ts`  
**Base Path:** `api/logistica/cash-box-renditions`

| # | Method | Full Route | Body / Params | Description |
|---|--------|-----------|---------------|-------------|
| 1 | POST | `/logistica/cash-box-renditions` | `CreateCashBoxRenditionDto` — `cash_box_id`, `start_date`, `end_date`, `opening_balance`, `closing_balance`, `actual_balance?`, `notes?` | Creates a new rendition (accountability report) for a cash box session. |
| 2 | GET | `/logistica/cash-box-renditions` | Query: `cash_box_id?` | Lists all renditions, optionally filtered by cash box. |
| 3 | GET | `/logistica/cash-box-renditions/:id` | Param: `id` | Gets a single rendition by ID. |
| 4 | PATCH | `/logistica/cash-box-renditions/:id/approve` | Param: `id` + `ApproveRenditionDto` — `actual_balance?`, `notes?` | Approves a pending rendition. |
| 5 | PATCH | `/logistica/cash-box-renditions/:id/reject` | Param: `id` | Rejects a pending rendition. |
| 6 | DELETE | `/logistica/cash-box-renditions/:id` | Param: `id` | Soft-deletes a rendition. |

---

## 9. Cash Box Transfers Controller

**File:** `src/modules/logistica/cash-box-transfers/cash-box-transfers.controller.ts`  
**Base Path:** `api/logistica/cash-box-transfers`

| # | Method | Full Route | Body / Params | Description |
|---|--------|-----------|---------------|-------------|
| 1 | POST | `/logistica/cash-box-transfers` | `CreateCashBoxTransferDto` — `session_id?`, `source_type` (cash_box\|bank_account), `source_id`, `dest_type` (cash_box\|bank_account), `dest_id`, `amount`, `currency_code`, `exchange_rate?`, `description?`, `reference?`, `transfer_type` (CASH_TO_CASH\|CASH_TO_BANK\|BANK_TO_CASH\|BANK_TO_BANK), `date?` | Creates a new transfer between a cash box and/or bank account. |
| 2 | GET | `/logistica/cash-box-transfers` | Query: `source_type?`, `source_id?`, `dest_type?`, `dest_id?`, `status?` | Lists all transfers with optional filters. |
| 3 | GET | `/logistica/cash-box-transfers/:id` | Param: `id` | Gets a single transfer by ID. |
| 4 | PATCH | `/logistica/cash-box-transfers/:id/confirm` | Param: `id` | Confirms a pending transfer (executes the movement at both ends). |
| 5 | PATCH | `/logistica/cash-box-transfers/:id/cancel` | Param: `id` | Cancels a pending transfer. |
| 6 | DELETE | `/logistica/cash-box-transfers/:id` | Param: `id` | Soft-deletes a transfer. |

---

## Summary

| Controller | Endpoints |
|-----------|-----------|
| Payments | 6 |
| Checks | 11 |
| Current Accounts | 5 |
| Bank Accounts | 6 |
| Treasury Reports | 2 |
| Cash Boxes | 12 |
| Cash Box Movements | 5 |
| Cash Box Renditions | 6 |
| Cash Box Transfers | 6 |
| **TOTAL** | **59** |

---

## Common Notes

1. **JWT Authentication:** All endpoints require JWT authentication via `JwtAuthGuard` at the controller level.
2. **Cash-Box Guards:** Mutations (POST/PATCH/DELETE) on cash-box routes additionally require `CashBoxAccessGuard`. Routes involving session state also require `CashBoxSessionGuard`.
3. **User Audit Injection:** All `@CurrentUser() user: AuthUser` parameters inject the authenticated user; `user.id` is passed to the service layer for audit fields (`created_by` / `updated_by` / `deleted_by`).
4. **RBAC Permissions:** All `RequirePermissions()` decorators are currently commented out. RBAC is defined but not enforced at the controller level.
5. **Soft-Delete Pattern:** All deletes follow the pattern: `deleted_at` and `deleted_by` fields are set on the row; all queries always filter `deleted_at: null`.
