'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Copy, Check, ChevronDown, Loader2 } from 'lucide-react';
import { truncateAddress } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Filter unique connectors by name to avoid duplicates
  const uniqueConnectors = useMemo(() => {
    const seen = new Set<string>();
    return connectors.filter((connector) => {
      const key = connector.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [connectors]);

  const handleConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (!connector) return;

    setConnectingId(connectorId);
    try {
      await connect({ connector });
    } catch {
      toast.error('Failed to connect wallet');
    } finally {
      setConnectingId(null);
    }
  };

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Connected state - show address dropdown
  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            {truncateAddress(address)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopy}>
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => disconnect()}>
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Disconnected state - show wallet selection dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isPending} className="gap-2">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          {isPending ? 'Connecting...' : 'Connect Wallet'}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {uniqueConnectors.map((connector) => (
          <DropdownMenuItem
            key={connector.id}
            onClick={() => handleConnect(connector.id)}
            disabled={connectingId === connector.id}
          >
            {connectingId === connector.id ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="mr-2 h-4 w-4" />
            )}
            {connector.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
