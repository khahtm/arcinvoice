# Phase 1: Transak SDK Integration

## Overview
Add Transak fiat payment widget to pay page as alternative to wallet-based payment.

---

## Tasks

### 1.1 Install SDK
```bash
npm install @transak/transak-sdk
```

### 1.2 Add Environment Variables
```env
# .env.local
NEXT_PUBLIC_TRANSAK_API_KEY=your-api-key
NEXT_PUBLIC_TRANSAK_ENV=STAGING
```

### 1.3 Create TransakPayButton Component

**File:** `components/payment/TransakPayButton.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TransakPayButtonProps {
  amount: number;              // Invoice amount in USDC
  walletAddress: string;       // Destination wallet (escrow or creator)
  invoiceCode: string;         // For tracking/metadata
  onSuccess: (orderId: string) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

export function TransakPayButton({
  amount,
  walletAddress,
  invoiceCode,
  onSuccess,
  onError,
  disabled = false,
}: TransakPayButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      // Dynamic import to avoid SSR issues
      const { default: TransakSDK } = await import('@transak/transak-sdk');

      const transak = new TransakSDK({
        apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY!,
        environment: process.env.NEXT_PUBLIC_TRANSAK_ENV || 'STAGING',

        // Crypto configuration
        cryptoCurrencyCode: 'USDC',
        network: 'polygon',  // or 'base' - Arc not yet supported
        walletAddress: walletAddress,
        disableWalletAddressForm: true,

        // Amount - pass as fiat amount (Transak converts)
        defaultFiatAmount: amount,
        defaultFiatCurrency: 'USD',

        // UI configuration
        themeColor: '000000',
        hideExchangeScreen: true,
        hideMenu: true,

        // Metadata for tracking
        partnerOrderId: invoiceCode,
        partnerCustomerId: walletAddress,

        // Widget settings
        widgetHeight: '650px',
        widgetWidth: '100%',
      });

      // Initialize widget
      transak.init();

      // Handle successful order
      transak.on(transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, (orderData: { status: { id: string } }) => {
        console.log('Transak order successful:', orderData);
        toast.success('Payment initiated successfully!');
        transak.close();
        onSuccess(orderData.status.id);
      });

      // Handle widget close
      transak.on(transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
        setIsLoading(false);
      });

      // Handle order created (funds processing)
      transak.on(transak.EVENTS.TRANSAK_ORDER_CREATED, (orderData: unknown) => {
        console.log('Transak order created:', orderData);
      });

      // Handle errors
      transak.on(transak.EVENTS.TRANSAK_ORDER_FAILED, (error: unknown) => {
        console.error('Transak order failed:', error);
        toast.error('Payment failed. Please try again.');
        transak.close();
        setIsLoading(false);
        onError?.(new Error('Payment failed'));
      });

    } catch (error) {
      console.error('Transak initialization error:', error);
      toast.error('Failed to initialize payment');
      setIsLoading(false);
      onError?.(error as Error);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      variant="outline"
      className="w-full"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      Pay with Card
    </Button>
  );
}
```

### 1.4 Add TypeScript Types for Transak SDK

**File:** `types/transak.d.ts`

```typescript
declare module '@transak/transak-sdk' {
  interface TransakConfig {
    apiKey: string;
    environment: 'STAGING' | 'PRODUCTION';
    cryptoCurrencyCode?: string;
    network?: string;
    walletAddress?: string;
    disableWalletAddressForm?: boolean;
    defaultFiatAmount?: number;
    defaultFiatCurrency?: string;
    themeColor?: string;
    hideExchangeScreen?: boolean;
    hideMenu?: boolean;
    partnerOrderId?: string;
    partnerCustomerId?: string;
    widgetHeight?: string;
    widgetWidth?: string;
    hostURL?: string;
  }

  interface TransakEvents {
    TRANSAK_ORDER_SUCCESSFUL: string;
    TRANSAK_ORDER_CREATED: string;
    TRANSAK_ORDER_FAILED: string;
    TRANSAK_WIDGET_CLOSE: string;
  }

  class TransakSDK {
    constructor(config: TransakConfig);
    EVENTS: TransakEvents;
    init(): void;
    close(): void;
    on(event: string, callback: (data: unknown) => void): void;
  }

  export default TransakSDK;
}
```

### 1.5 Update Pay Page

**File:** `app/pay/[code]/page.tsx`

Add imports:
```typescript
import { TransakPayButton } from '@/components/payment/TransakPayButton';
```

Add handler:
```typescript
const handleTransakSuccess = async (orderId: string) => {
  try {
    const res = await fetch(`/api/pay/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: invoice?.payment_type === 'direct' ? 'released' : 'funded',
        tx_hash: `transak:${orderId}`,  // Prefix to identify Transak payments
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update invoice');
    }

    toast.success('Payment successful!');
    router.push(`/pay/${code}/success?tx=transak:${orderId}`);
  } catch (err) {
    console.error('Payment update error:', err);
    toast.error('Payment processing. Status update may be delayed.');
    router.push(`/pay/${code}/success?tx=transak:${orderId}`);
  }
};
```

Update Payment Actions section (around line 263):
```typescript
{/* Payment Actions */}
{isPaid ? (
  <div className="mt-4 text-center">
    <p className="text-muted-foreground">
      This invoice has already been {invoice.status}.
    </p>
  </div>
) : (
  <div className="space-y-4 mt-4">
    {/* Divider with "or" */}
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">
          Payment Options
        </span>
      </div>
    </div>

    {/* Crypto Payment */}
    <div className="space-y-2">
      <div className="flex justify-center">
        <ConnectButton />
      </div>

      {invoice.payment_type === 'direct' && (
        <DirectPayButton
          amount={invoice.amount}
          recipient={invoice.creator_wallet as `0x${string}`}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}

      {/* V1/V2: Fund all upfront */}
      {invoice.payment_type === 'escrow' &&
        invoice.escrow_address &&
        !isV3 && (
          <FundEscrowButton
            escrowAddress={invoice.escrow_address as `0x${string}`}
            amount={invoice.amount.toString()}
            contractVersion={invoice.contract_version}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )}
    </div>

    {/* Divider */}
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">
          or pay with card
        </span>
      </div>
    </div>

    {/* Fiat Payment - Transak */}
    {!isV3 && (
      <TransakPayButton
        amount={invoice.amount}
        walletAddress={
          invoice.escrow_address || invoice.creator_wallet
        }
        invoiceCode={invoice.short_code}
        onSuccess={handleTransakSuccess}
        onError={handlePaymentError}
      />
    )}

    {/* V3 Milestone Note */}
    {isV3 && invoice.escrow_address && (
      <p className="text-sm text-muted-foreground text-center">
        Fund milestones above as work is completed
      </p>
    )}

    {invoice.payment_type === 'escrow' && !invoice.escrow_address && (
      <p className="text-sm text-muted-foreground text-center">
        Escrow not yet created. Please contact the invoice creator.
      </p>
    )}
  </div>
)}
```

### 1.6 Update PATCH API to Accept Transak Order IDs

**File:** `app/api/pay/[code]/route.ts`

Update schema to accept Transak order IDs:
```typescript
const updateSchema = z.object({
  status: z.enum(['funded', 'released']),
  tx_hash: z.string().regex(/^(0x[a-fA-F0-9]{64}|transak:[a-zA-Z0-9-]+)$/, 'Invalid transaction hash'),
});
```

---

## Testing Checklist

- [ ] Transak staging API key configured
- [ ] "Pay with Card" button appears on pay page
- [ ] Clicking button opens Transak widget modal
- [ ] Can complete test payment in staging
- [ ] Invoice status updates on success
- [ ] User redirects to success page
- [ ] Error handling works (close widget, network error)

---

## Notes

### Arc Network Consideration
Since Arc is not yet on Transak, we use Polygon for now. When Arc mainnet launches and Transak adds support, update:
```typescript
network: 'arc',  // or whatever Transak names it
```

### V3 Milestone Payments
Transak fiat is disabled for V3 invoices because:
1. V3 requires sequential milestone funding
2. Transak doesn't know about milestone structure
3. Would need complex coordination

Future: Could add per-milestone Transak buttons, but adds complexity.

### Fee Display
Consider adding a note about Transak fees:
```tsx
<p className="text-xs text-muted-foreground">
  Card payments include ~3-5% processing fee
</p>
```
