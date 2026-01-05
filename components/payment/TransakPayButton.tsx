'use client';

import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface TransakPayButtonProps {
  amount: number; // Invoice amount in USDC
  walletAddress: string; // Destination wallet (escrow or creator)
  invoiceCode: string; // For tracking/metadata
  onSuccess: (orderId: string) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
}

// TODO: Re-enable Transak integration when Arc mainnet launches
// Build Transak widget URL with query params
// function buildTransakWidgetUrl(params: {...}): string { ... }

export function TransakPayButton({
  disabled = false,
}: TransakPayButtonProps) {

  const handleClick = () => {
    // Coming soon - disabled on testnet
    toast.info('Pay with Card coming soon!');
  };

  return (
    <div className="space-y-1">
      <Button
        onClick={handleClick}
        disabled={disabled}
        variant="outline"
        className="w-full"
      >
        <CreditCard className="mr-2 h-4 w-4" />
        Pay with Card
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Visa, Mastercard, Apple Pay, Bank Transfer
      </p>
    </div>
  );
}
