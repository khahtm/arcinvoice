'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Shield, Building2, ExternalLink } from 'lucide-react';

export function USYCInfoModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Earn Yield
          <Badge variant="secondary" className="ml-1 text-xs">
            Soon
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Earn Yield with USYC
          </DialogTitle>
          <DialogDescription>
            Coming soon to Arc Invoice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium">What is USYC?</h4>
            <p className="text-sm text-muted-foreground">
              USYC is Circle&apos;s tokenized money market fund — a yield-bearing digital asset backed by short-term US Treasury bills.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">~5% APY</p>
                <p className="text-xs text-muted-foreground">
                  Earn yield on escrow funds while held
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Treasury-Backed</p>
                <p className="text-xs text-muted-foreground">
                  Secured by short-term US Treasury bills
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
                <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Circle</p>
                <p className="text-xs text-muted-foreground">
                  Issued by Circle, a NYSE-listed company
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              Soon, you&apos;ll be able to earn yield on your escrow funds automatically. We&apos;re working on bringing this feature to Arc Invoice.
            </p>
          </div>

          <a
            href="https://www.circle.com/usyc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Learn more about USYC
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
