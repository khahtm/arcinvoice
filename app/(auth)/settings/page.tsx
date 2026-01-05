'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { truncateAddress } from '@/lib/utils';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { address, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Wallet</h2>

        <div>
          <p className="text-sm text-muted-foreground">Connected Address</p>
          <p className="font-mono text-lg">{address ? truncateAddress(address) : '-'}</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">Full Address</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded break-all">
              {address}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {chain && (
          <div>
            <p className="text-sm text-muted-foreground">Network</p>
            <p className="font-medium">{chain.name}</p>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button variant="destructive" onClick={() => disconnect()}>
            Disconnect Wallet
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Resources</h2>

        <div className="space-y-2">
          <a
            href="https://testnet.arcscan.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Arc Testnet Explorer
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://arc.circle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            Arc Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Card>
    </div>
  );
}
