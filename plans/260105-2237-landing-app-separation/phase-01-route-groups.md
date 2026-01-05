# Phase 1: Route Group Structure

**Status:** Complete
**Estimated Changes:** 8 files

---

## Objective

Create Next.js route groups and reorganize file structure.

---

## Tasks

### 1.1 Create Marketing Route Group

```bash
mkdir app/(marketing)
```

### 1.2 Create App Route Group

```bash
mkdir app/(app)
```

### 1.3 Move Landing Page

```bash
# Move landing page to marketing group
mv app/page.tsx app/(marketing)/page.tsx
```

### 1.4 Move Auth Routes to App Group

```bash
# Rename (auth) to (app)
mv app/(auth)/dashboard app/(app)/dashboard
mv app/(auth)/invoices app/(app)/invoices
mv app/(auth)/settings app/(app)/settings
mv app/(auth)/analytics app/(app)/analytics
mv app/(auth)/layout.tsx app/(app)/layout.tsx
rmdir app/(auth)
```

### 1.5 Create Marketing Layout

Create `app/(marketing)/layout.tsx`:

```tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `app/(marketing)/layout.tsx` |
| Move | `app/page.tsx` → `app/(marketing)/page.tsx` |
| Move | `app/(auth)/dashboard/*` → `app/(app)/dashboard/*` |
| Move | `app/(auth)/invoices/*` → `app/(app)/invoices/*` |
| Move | `app/(auth)/settings/*` → `app/(app)/settings/*` |
| Move | `app/(auth)/analytics/*` → `app/(app)/analytics/*` |
| Move | `app/(auth)/layout.tsx` → `app/(app)/layout.tsx` |
| Delete | `app/(auth)/` (empty after moves) |

---

## Verification

```bash
# Check structure
ls -la app/
ls -la app/(marketing)/
ls -la app/(app)/

# Build test
npm run build
```

---

## Notes

- Route groups `(marketing)` and `(app)` don't affect URL paths
- `/` still serves marketing landing page
- `/dashboard` still serves app dashboard
- Only the layout hierarchy changes
