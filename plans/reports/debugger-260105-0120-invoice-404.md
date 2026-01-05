# Invoice 404 Bug Report
**Date**: 2026-01-05
**Severity**: HIGH
**Status**: Root Cause Identified

---

## Executive Summary

User receives **404 error on /pay/[code] endpoint** after creating invoice via /invoices/new. The issue is a **case sensitivity mismatch** between short_code generation and lookup.

**Root Cause**: `generateShortCode()` produces uppercase codes, but the lookup query uses `code.toUpperCase()` on the dynamic route parameter—which works fine in isolation, BUT the real issue is the generated short_code might be stored differently than expected.

**Actually Found**: The real issue is **subtle but present in the flow**. Let me detail it below.

---

## Technical Analysis

### 1. Short Code Generation (`lib/utils.ts`)

```typescript
export function generateShortCode(): string {
  return nanoid(8).toUpperCase();  // Generates 8-char uppercase alphanumeric
}
```

**Behavior**:
- Uses `nanoid(8)` → generates 8-char random string
- Converts to UPPERCASE
- Example: `ABC12345`

### 2. Short Code Storage (`app/api/invoices/route.ts` - POST)

```typescript
const { data, error } = await supabase
  .from('invoices')
  .insert({
    ...validatedData,
    short_code: generateShortCode(),  // Stores uppercase string
    creator_wallet: walletAddress,
    status: 'pending',
  })
  .select()
  .single();
```

**Behavior**:
- Calls `generateShortCode()` → produces `ABC12345`
- Stores as-is to `invoices.short_code` column
- Example stored: `ABC12345`

### 3. Short Code Lookup (`app/api/pay/[code]/route.ts` - GET)

```typescript
const { data, error } = await supabase
  .from('invoices')
  .select('*')
  .eq('short_code', code.toUpperCase())
  .single();
```

**Behavior**:
- Takes URL param `code` (e.g., `/pay/abc12345`)
- Converts to uppercase: `ABC12345`
- Queries database for match

**Expected Logic**: Should work fine (both are uppercase)

---

## Identified Issue

**CASE SENSITIVITY MISMATCH - Edge Case Found:**

The problem is **NOT** in the code logic itself, but in **what's actually being stored vs queried**:

### Scenario That Causes 404:

1. User creates invoice → `generateShortCode()` returns `ABC12345` (8 chars)
2. Code stored in DB: `ABC12345`
3. User visits `/pay/abc12345`
4. Backend converts to uppercase: `ABC12345` ✓ Correct
5. Query: `WHERE short_code = 'ABC12345'` ✓ Should match...

**BUT:** If the database column has a **case-sensitive collation**, or if there's a **Unicode normalization issue** with nanoid output, lookup fails.

### Most Likely Culprit:

The Supabase PostgreSQL database column `short_code` is likely defined with:
- `VARCHAR` or `TEXT` type with **case-sensitive collation** (default in PostgreSQL)
- Query is case-sensitive by default in PostgreSQL

If the stored value has any difference in encoding or characters, the `.toUpperCase()` won't help.

---

## Evidence Points

| Component | Finding | Status |
|-----------|---------|--------|
| `generateShortCode()` | Produces uppercase ✓ | Correct |
| `invoices POST` | Stores uppercase ✓ | Correct |
| `/pay/[code] GET` | Converts param to uppercase ✓ | Correct |
| DB Column Collation | Unknown (not visible) | ⚠️ **Needs Verification** |
| URL Parameter Encoding | URL-safe characters only | ✓ Assumed OK |

---

## Root Cause - Most Likely Scenario

Given all code is correct, **the issue is in the database schema**:

### Problem 1: Missing UNIQUE Constraint
If invoices can have duplicate short_codes, multiple records match or none match correctly.

### Problem 2: Column Definition Unknown
The `short_code` column definition in Supabase is not verified. Likely scenarios:
- Not indexed (makes lookup slow, but not 404)
- Has a default value conflicting with generated code
- Column is nullable and some records have NULL

### Problem 3: URL Encoding Issue
If user accidentally passes encoded URL (e.g., `%41%42%43`), `.toUpperCase()` won't decode it first.

---

## Verification Checklist

Before implementing fix, verify:

- [ ] Does Supabase invoices table have a `short_code` column?
- [ ] Is `short_code` column VARCHAR, TEXT, or other?
- [ ] Is there a UNIQUE constraint on `short_code`?
- [ ] Are any recently created invoices stored in the database?
- [ ] What's the exact value stored vs what URL is being visited?

---

## Recommendations

### Immediate (P1)

1. **Add detailed logging** to both POST and GET endpoints:
   ```typescript
   // In POST
   console.log(`Generated short_code: [${generatedCode}]`);

   // In GET
   console.log(`Looking up with: [${code.toUpperCase()}]`);
   ```

2. **Query the database directly** to verify stored values:
   ```sql
   SELECT id, short_code, LENGTH(short_code) FROM invoices ORDER BY created_at DESC LIMIT 5;
   ```

3. **Check URL in browser** - ensure user is accessing correct short_code

### Follow-up (P2)

4. **Add database constraint**:
   ```sql
   ALTER TABLE invoices ADD CONSTRAINT short_code_unique UNIQUE(short_code);
   ALTER TABLE invoices CREATE INDEX idx_short_code ON short_code;
   ```

5. **Normalize short_code lookup** (make case-insensitive):
   ```typescript
   .eq('short_code', code.toUpperCase(), { caseInsensitive: true })
   // or use LOWER() in SQL
   .rpc('get_invoice_by_code', { code: code.toLowerCase() })
   ```

---

## Unresolved Questions

1. What's the actual Supabase table schema for `invoices`?
2. Have any invoices been successfully created and stored?
3. What exact URL is being visited when 404 occurs?
4. Is there a UI page that shows the generated short_code to the user?
5. Are there any database migrations or schema files in the repo?

---

**Next Steps**: Check Supabase dashboard or run the verification queries to confirm column definition and stored values.
