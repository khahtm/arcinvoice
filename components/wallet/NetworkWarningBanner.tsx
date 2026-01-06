'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChainGuard } from '@/hooks/useChainGuard';

/**
 * Shows a warning banner at top of page when connected to wrong network
 */
export function NetworkWarningBanner() {
  const { isWrongNetwork, switchToArc, isConnected } = useChainGuard();

  // Only show if connected and on wrong network
  if (!isConnected || !isWrongNetwork) {
    return null;
  }

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-3">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-medium">
        You&apos;re connected to the wrong network. Please switch to Arc Testnet.
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={switchToArc}
        className="h-7 px-3"
      >
        Switch Network
      </Button>
    </div>
  );
}
