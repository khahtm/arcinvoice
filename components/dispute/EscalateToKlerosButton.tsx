'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useKleros } from '@/hooks/useKleros';
import { Scale, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface EscalateToKlerosButtonProps {
  invoiceId: string;
  disputeId: string;
  disabled?: boolean;
}

export function EscalateToKlerosButton({
  invoiceId,
  disputeId,
  disabled,
}: EscalateToKlerosButtonProps) {
  const [open, setOpen] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const { escalate } = useKleros(invoiceId, disputeId);

  const handleEscalate = async () => {
    setIsEscalating(true);
    try {
      const result = await escalate();
      toast.success('Dispute escalated to Kleros');

      // Open Kleros court in new tab
      window.open('https://court.kleros.io', '_blank');

      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to escalate');
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="border-purple-300 text-purple-700 hover:bg-purple-50"
      >
        <Scale className="h-4 w-4 mr-2" />
        Escalate to Kleros
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-600" />
              Escalate to Kleros Arbitration
            </DialogTitle>
            <DialogDescription>
              Submit this dispute to Kleros decentralized court for resolution by randomly selected
              jurors.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">How it works:</h4>
              <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                <li>Pay arbitration fee (~$50-100 in ETH)</li>
                <li>Both parties submit evidence (7 days)</li>
                <li>Random jurors vote on outcome</li>
                <li>Ruling is executed on-chain</li>
              </ol>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg flex gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Important Notice
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Kleros operates on Ethereum mainnet. You&apos;ll need ETH for the arbitration
                  fee.
                </p>
              </div>
            </div>

            <a
              href="https://kleros.io/how-it-works"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              Learn more about Kleros
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEscalate}
              disabled={isEscalating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isEscalating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Scale className="h-4 w-4 mr-2" />
              )}
              Proceed to Kleros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
