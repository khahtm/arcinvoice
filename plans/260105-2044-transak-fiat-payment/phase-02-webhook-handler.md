# Phase 2: Transak Webhook Handler (Optional)

## Overview
Add webhook endpoint for Transak order confirmations as backup verification.

**Note:** This phase is optional for MVP. The SDK's `TRANSAK_ORDER_SUCCESSFUL` event is usually sufficient.

---

## When to Implement

Implement webhooks if:
- Need server-side confirmation (user might close browser)
- Want audit trail of all Transak payments
- Need to handle delayed order completions

---

## Tasks

### 2.1 Add Environment Variable

```env
# .env.local
TRANSAK_ACCESS_TOKEN=your-access-token
```

### 2.2 Create Webhook Endpoint

**File:** `app/api/webhooks/transak/route.ts`

```typescript
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// Transak webhook payload structure
interface TransakWebhookPayload {
  webhookData: {
    id: string;
    partnerOrderId: string;  // Our invoice short_code
    status: string;          // 'COMPLETED' | 'FAILED' | etc.
    cryptoAmount: number;
    cryptoCurrency: string;
    fiatAmount: number;
    fiatCurrency: string;
    walletAddress: string;
    transactionHash?: string;
    network: string;
  };
}

export async function POST(req: Request) {
  try {
    // Transak sends encrypted payload - parse it
    const body = await req.json();

    // Log for debugging (remove in production)
    console.log('Transak webhook received:', JSON.stringify(body, null, 2));

    // Validate payload structure
    if (!body.webhookData) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const { webhookData } = body as TransakWebhookPayload;
    const { partnerOrderId, status, id: transakOrderId, transactionHash } = webhookData;

    // Only process completed orders
    if (status !== 'COMPLETED') {
      console.log(`Transak order ${transakOrderId} status: ${status}, skipping`);
      return NextResponse.json({ received: true });
    }

    // partnerOrderId should be our invoice short_code
    if (!partnerOrderId) {
      console.error('No partnerOrderId in webhook');
      return NextResponse.json(
        { error: 'Missing partnerOrderId' },
        { status: 400 }
      );
    }

    // Update invoice status
    const supabase = createAdminClient();

    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, payment_type')
      .eq('short_code', partnerOrderId.toUpperCase())
      .single();

    if (fetchError || !invoice) {
      console.error('Invoice not found:', partnerOrderId);
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Skip if already processed
    if (invoice.status !== 'pending') {
      console.log(`Invoice ${partnerOrderId} already ${invoice.status}`);
      return NextResponse.json({ received: true, skipped: true });
    }

    // Determine new status based on payment type
    const newStatus = invoice.payment_type === 'direct' ? 'released' : 'funded';

    // Update invoice
    const txHash = transactionHash || `transak:${transakOrderId}`;

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: newStatus,
        tx_hash: txHash,
        funded_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    if (updateError) {
      console.error('Failed to update invoice:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invoice' },
        { status: 500 }
      );
    }

    console.log(`Invoice ${partnerOrderId} updated to ${newStatus} via webhook`);
    return NextResponse.json({ received: true, updated: true });

  } catch (error) {
    console.error('Transak webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Transak may send GET request to verify endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'transak-webhook' });
}
```

### 2.3 Configure Webhook in Transak Dashboard

1. Go to Transak Partner Dashboard
2. Navigate to Webhooks section
3. Add webhook URL: `https://your-domain.com/api/webhooks/transak`
4. Select events: `ORDER_COMPLETED`, `ORDER_FAILED`
5. Save configuration

---

## Security Considerations

### Transak Webhook Verification

Transak uses encrypted payloads. For production, implement proper verification:

```typescript
// Future: Add proper Transak webhook verification
// Transak provides ACCESS_TOKEN for decryption
// See: https://docs.transak.com/docs/webhooks

import crypto from 'crypto';

function verifyTransakWebhook(
  encryptedPayload: string,
  accessToken: string
): TransakWebhookPayload | null {
  try {
    // Transak's decryption method
    // Implementation depends on their current API
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      accessToken.slice(0, 32),
      accessToken.slice(32, 48)
    );
    let decrypted = decipher.update(encryptedPayload, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Webhook verification failed:', error);
    return null;
  }
}
```

### Rate Limiting

Consider adding rate limiting to prevent abuse:
```typescript
// Use Vercel's edge config or upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit';
```

---

## Testing

### Local Testing with ngrok

```bash
# Start local dev server
npm run dev

# In another terminal, expose to internet
ngrok http 3000

# Copy ngrok URL and configure in Transak dashboard
# https://xxxx.ngrok.io/api/webhooks/transak
```

### Staging Test

1. Make test payment via Transak staging
2. Check server logs for webhook receipt
3. Verify invoice status updated in Supabase

---

## Testing Checklist

- [ ] Webhook endpoint responds to GET (health check)
- [ ] POST with valid payload updates invoice
- [ ] Invalid payloads return proper error
- [ ] Already-processed invoices are skipped
- [ ] Logs are clean and informative

---

## Notes

### Idempotency
The webhook handler is idempotent - it checks if invoice is already processed and skips if so. This handles:
- Transak retry on network failure
- Duplicate webhook calls
- SDK + webhook both firing

### Error Handling
On errors, we return appropriate HTTP codes:
- 400: Invalid payload
- 404: Invoice not found
- 500: Processing error

Transak will retry on 5xx errors.
