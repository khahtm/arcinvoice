'use client';

import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { useEffect } from 'react';

export default function HomePage() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">Arc Invoice</h1>
        <p className="text-muted-foreground mb-8">
          Generate payment links with escrow protection on Arc blockchain. Fast,
          secure, trustless.
        </p>

        <ConnectButton />

        <p className="text-sm text-muted-foreground mt-4">
          Connect your wallet to get started
        </p>
      </div>
    </div>
  );
}
