# Phase 4: Subdomain Configuration

**Status:** Complete
**Estimated Changes:** 2 files

---

## Objective

Configure subdomain routing for production deployment on Vercel.

---

## Architecture

| Domain | Route Group | Purpose |
|--------|-------------|---------|
| arcinvoice.xyz | (marketing) | Landing page, marketing |
| app.arcinvoice.xyz | (app) | Dashboard, invoices, settings |
| arcinvoice.xyz/pay/* | pay | Public payment pages |

---

## Tasks

### 4.1 Create Vercel Configuration

Create `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/:path(dashboard|invoices|settings|analytics|api/invoices|api/analytics|api/notifications)/:rest*",
      "has": [
        {
          "type": "host",
          "value": "app.arcinvoice.xyz"
        }
      ],
      "destination": "/:path/:rest*"
    },
    {
      "source": "/",
      "has": [
        {
          "type": "host",
          "value": "app.arcinvoice.xyz"
        }
      ],
      "destination": "/dashboard"
    }
  ]
}
```

### 4.2 Update Production Environment

Create `.env.production`:

```env
NEXT_PUBLIC_APP_URL=https://app.arcinvoice.xyz/dashboard
```

### 4.3 Configure Vercel Domains

In Vercel dashboard:
1. Go to Project Settings → Domains
2. Add `arcinvoice.xyz` (main domain)
3. Add `app.arcinvoice.xyz` (subdomain)
4. Both point to same deployment

---

## Development vs Production

### Development (localhost)

```env
# .env.local
NEXT_PUBLIC_APP_URL=/dashboard
```

- Landing: `localhost:3000`
- App: `localhost:3000/dashboard`
- Same origin, route-based separation

### Production (Vercel)

```env
# .env.production
NEXT_PUBLIC_APP_URL=https://app.arcinvoice.xyz/dashboard
```

- Landing: `arcinvoice.xyz`
- App: `app.arcinvoice.xyz`
- Subdomain routing via Vercel rewrites

---

## Alternative: Middleware Approach

If Vercel rewrites don't work, use Next.js middleware:

Create `middleware.ts`:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const isAppSubdomain = hostname.startsWith('app.');

  // If on app subdomain and requesting root, redirect to dashboard
  if (isAppSubdomain && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `vercel.json` - Subdomain rewrites |
| Create | `.env.production` - Production app URL |
| Optional | `middleware.ts` - Fallback routing |

---

## Verification

### Local Testing

```bash
npm run build
npm run start

# Test routes work correctly
curl localhost:3000           # Landing page
curl localhost:3000/dashboard # Dashboard (should prompt wallet)
```

### Production Testing

After Vercel deploy:
1. Visit `arcinvoice.xyz` → Should show landing page
2. Click "Launch App" → Should go to `app.arcinvoice.xyz/dashboard`
3. Visit `app.arcinvoice.xyz` → Should redirect to dashboard
4. Visit `arcinvoice.xyz/pay/ABC123` → Should show payment page

---

## DNS Configuration

If using custom domain:

```
Type    Name    Value
A       @       76.76.21.21 (Vercel)
CNAME   app     cname.vercel-dns.com
```

---

## Notes

- Vercel handles subdomain routing automatically with proper config
- Both domains share the same Next.js deployment
- No code changes needed for subdomain routing - just config
- API routes work on both domains (auth cookies shared)
