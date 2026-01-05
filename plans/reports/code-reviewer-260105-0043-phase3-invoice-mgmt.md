# Code Review Report: Phase 3 Invoice Management

**Reviewed:** 2026-01-05
**Reviewer:** code-reviewer agent
**Plan:** plans/260104-2313-arc-invoice-mvp/phase-03-invoice-management.md
**Commit Range:** Phase 3 implementation

---

## Executive Summary

Phase 3 invoice management implementation **functionally complete** but contains **3 CRITICAL security vulnerabilities** blocking production deployment. Build passes, type safety good, but API endpoints have authentication bypass and injection risks.

**Verdict:** ❌ **DO NOT DEPLOY** - Fix Critical #1, #2 before any production use.

---

## Scope

**Files Reviewed:**
- `lib/validation.ts` (Zod schemas)
- `app/api/invoices/route.ts` (list/create API)
- `app/api/invoices/[id]/route.ts` (get/update API)
- `hooks/useInvoices.ts` (data fetching)
- `components/invoice/PaymentTypeSelector.tsx`
- `components/invoice/InvoiceForm.tsx`
- `components/invoice/InvoiceCard.tsx`
- `app/(auth)/layout.tsx`
- `app/(auth)/invoices/page.tsx`
- `app/(auth)/invoices/new/page.tsx`

**Lines Analyzed:** ~450 LOC
**Build Status:** ✓ Passes (TypeScript + Next.js)
**Lint Status:** 2 warnings (non-blocking)

---

## Critical Issues (BLOCK DEPLOYMENT)

### 1. Injection Vulnerability - PATCH Accepts Arbitrary Field Updates

**Severity:** 🔴 CRITICAL
**File:** `app/api/invoices/[id]/route.ts:36-52`

**Vulnerability:**
```typescript
const body = await req.json();  // NO VALIDATION
const { data, error } = await supabase
  .from('invoices')
  .update(body)  // CAN UPDATE ANY FIELD
  .eq('id', id)
```

**Exploit:**
```bash
PATCH /api/invoices/123
{
  "status": "released",
  "escrow_address": "0xAttacker",
  "tx_hash": "0xfake",
  "amount": 999999
}
# Attacker bypasses payment, marks invoice released
```

**Impact:** Fund theft, payment bypass, invoice manipulation
**CVSS:** 9.1 (Critical)

**Fix:**
```typescript
import { invoiceSchema } from '@/lib/validation';

const allowedFields = invoiceSchema.pick({
  description: true,
  client_name: true,
  client_email: true,
}).partial();

const validatedData = allowedFields.parse(body);
const { data, error } = await supabase
  .from('invoices')
  .update(validatedData)
```

---

### 2. Authentication Bypass - GET Endpoint Public

**Severity:** 🔴 CRITICAL
**File:** `app/api/invoices/[id]/route.ts:4-22`

**Vulnerability:**
```typescript
export async function GET(req: Request, { params }) {
  // NO wallet-address CHECK
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
```

**Impact:** Anyone with invoice UUID can view full invoice data (wallet addresses, amounts, client info)

**Decision Required:**
- **Option A:** Public access intentional for `/pay/:code` pages → Document this
- **Option B:** Private invoices → Add auth check:
  ```typescript
  const walletAddress = cookieStore.get('wallet-address')?.value;
  if (!walletAddress) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (data?.creator_wallet !== walletAddress) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  ```

---

### 3. UUID Enumeration Attack Vector

**Severity:** 🔴 CRITICAL
**File:** `app/api/invoices/[id]/route.ts`

**Issue:** Uses database UUID in URLs instead of `short_code`

**Current:** `/invoices/550e8400-e29b-41d4-a716-446655440000`
**Should be:** `/pay/ABC12XYZ`

**Risk:** If GET remains unauthenticated, attackers can enumerate UUIDs to discover invoices

**Fix:** Phase 4 should use `short_code` for public payment pages, reserve UUID routes for authenticated users only

---

## High Priority Issues

### 4. Email Validation Bypass

**Severity:** 🟠 HIGH
**File:** `lib/validation.ts:8-13`

```typescript
client_email: z
  .string()
  .email('Invalid email')  // Only validates if non-empty
  .optional()
  .nullable()
  .or(z.literal(''));  // ALLOWS '' bypass
```

**Problem:** `""` passes validation, stores in DB without format check

**Fix:**
```typescript
client_email: z
  .string()
  .email('Invalid email')
  .optional()
  .nullable()
  .transform(val => val === '' ? null : val),
```

---

### 5. Missing Error Handling - PATCH Endpoint

**Severity:** 🟠 HIGH
**File:** `app/api/invoices/[id]/route.ts:24-62`

**Issue:** No try-catch wrapper (POST has it)

```typescript
export async function PATCH(req: Request, ...) {
  const body = await req.json();  // Can throw SyntaxError
  // No error handling
}
```

**Impact:** Malformed JSON returns 500 with stack trace in production

**Fix:** Wrap entire handler in try-catch like POST

---

### 6. Race Condition - Duplicate Fetch Logic

**Severity:** 🟠 HIGH
**File:** `hooks/useInvoices.ts:12-57`

**Issue:**
```typescript
const fetchInvoices = useCallback(async () => {
  // Fetch implementation
}, []);

useEffect(() => {
  const load = async () => {
    // DUPLICATE fetch logic
  };
  load();
}, []);  // Missing fetchInvoices dependency
```

**Impact:** Two concurrent API calls on mount, potential stale state

**Fix:** Consolidate into single function called by useEffect

---

### 7. Lost Error Context

**Severity:** 🟠 HIGH
**Files:** `hooks/useInvoices.ts:22,44,71`

```typescript
} catch {  // Error type lost
  setError('Failed to fetch invoices');
}
```

**Fix:**
```typescript
} catch (error) {
  const msg = error instanceof Error ? error.message : 'Failed to fetch';
  setError(msg);
}
```

---

### 8. Schema Default Not Enforced

**Severity:** 🟠 HIGH
**File:** `lib/validation.ts:14`

```typescript
auto_release_days: z.number().min(1).max(90).optional(),  // No .default(14)
```

Route.ts manually adds `?? 14`. Inconsistent if schema used elsewhere.

**Fix:**
```typescript
auto_release_days: z.number().min(1).max(90).default(14),
```

---

## Medium Priority

### 9. Magic Strings - Status Values

**File:** `app/api/invoices/route.ts:49`

```typescript
status: 'pending',  // Should use constant
```

**Fix:** Export `INVOICE_STATUS` enum from `types/database.ts`

---

### 10. Inconsistent Error Format

**File:** `app/api/invoices/route.ts:61`

```typescript
return Response.json({ error: error.issues }, { status: 400 });  // Array
// Other endpoints return { error: string }
```

**Fix:**
```typescript
return Response.json({
  error: 'Validation failed',
  details: error.issues
}, { status: 400 });
```

---

### 11. Missing Fallback - Status Badge

**File:** `components/invoice/InvoiceCard.tsx:36`

```typescript
<Badge className={statusColors[invoice.status]}>
```

If unknown status, `className` is `undefined`.

**Fix:**
```typescript
<Badge className={statusColors[invoice.status] || 'bg-gray-500'}>
```

---

### 12. Unused Import

**File:** `app/(auth)/layout.tsx:18`

ESLint: `'router' is assigned a value but never used`

**Fix:** Remove `const router = useRouter();`

---

### 13. Accessibility Gap

**File:** `components/invoice/PaymentTypeSelector.tsx:16-46`

Interactive cards lack keyboard navigation/ARIA.

**Fix:**
```typescript
<Card
  role="radio"
  aria-checked={value === 'direct'}
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && onChange('direct')}
```

---

## Low Priority

### 14. USDC Decimal Display Mismatch

**File:** `lib/utils.ts:22`

Current: `maximumFractionDigits: 2`
Plan spec (line 72): `maximumFractionDigits: 6`

USDC has 6 decimals. Should amounts show `$1000.123456`?

**Decision Required:** Clarify display precision

---

### 15. Missing Memoization

**File:** `components/invoice/InvoiceCard.tsx`

Re-renders on every parent update.

**Optimization:**
```typescript
import { memo } from 'react';
export const InvoiceCard = memo(function InvoiceCard({ invoice }) { ... });
```

---

### 16. React Compiler Warning

**File:** `components/invoice/InvoiceForm.tsx:32`

ESLint warning about `watch()` incompatibility with React Compiler (experimental).

**Action:** None - React Hook Form team aware, not blocking.

---

## Positive Findings

✅ Build passes (TypeScript compilation clean)
✅ Validation schema well-structured (Zod)
✅ POST endpoint error handling comprehensive
✅ Type safety complete (all props/returns typed)
✅ Ownership verification in PATCH (checks creator_wallet)
✅ Loading states implemented (Skeleton)
✅ Responsive design (grid layouts)
✅ Clean import patterns (@/ alias)
✅ React best practices (functional components, hooks)

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | 95% |
| Build Status | ✅ Pass |
| Linting | 2 warnings |
| Security Issues | 3 Critical, 5 High, 4 Medium, 3 Low |
| Test Coverage | N/A (no tests) |
| Lines of Code | ~450 |

---

## Action Plan

### Immediate (BLOCKING)
1. ⚠️ **Fix Critical #1** - Validate PATCH body (30 min)
2. ⚠️ **Fix Critical #2** - Add GET auth OR document public access (15 min)
3. ⚠️ **Fix High #4** - Email validation bypass (10 min)
4. ⚠️ **Fix High #5** - PATCH error handling (5 min)

**Estimated:** 60 min to unblock deployment

### Before Phase 4
5. Fix High #6 - Race condition (20 min)
6. Fix Medium #9 - Status constants (15 min)
7. Fix Medium #10 - Error format consistency (10 min)

### Phase 4 Integration
8. Use `short_code` for public payment URLs (Critical #3)
9. Decide USDC decimal display precision (Low #14)

### Backlog
10. Accessibility improvements
11. Memoization optimizations
12. Unused variable cleanup

---

## Unresolved Questions

1. **Authentication intent:** Should GET `/api/invoices/[id]` be public for payment pages?
2. **USDC display:** Show 2 or 6 decimal places?
3. **Invoice detail page:** Deferred to Phase 4 or implement now?
4. **Test strategy:** When to add unit/integration tests?

---

**Report Generated:** 2026-01-05
**Next Review:** After Critical/High fixes applied
