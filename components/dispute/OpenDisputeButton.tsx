'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface OpenDisputeButtonProps {
  onSubmit: (reason: string) => Promise<void>;
}

export function OpenDisputeButton({ onSubmit }: OpenDisputeButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (reason.length < 10) {
      toast.error('Please provide more details (at least 10 characters)');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(reason);
      toast.success('Dispute opened');
      setOpen(false);
      setReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open dispute');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Open Dispute
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a Dispute</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Describe the issue you&apos;re experiencing. Both parties will have
            7 days to reach a resolution.
          </p>
          <Textarea
            placeholder="Describe the issue in detail..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Open Dispute'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
