'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Providers } from './providers';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { useSession } from '@/hooks/useSession';
import { useSIWE } from '@/hooks/useSIWE';
import { MobileNav } from '@/components/layout/MobileNav';
import { toast } from 'sonner';

// Inner component that uses wagmi hooks (must be inside Providers)
function AuthContent({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isLoading: sessionLoading, refresh } = useSession();
  const { signIn, signOut, isLoading: siweLoading } = useSIWE();

  // Auto sign-in when wallet is connected but not authenticated
  useEffect(() => {
    if (isConnected && address && !isAuthenticated && !sessionLoading && !siweLoading) {
      signIn()
        .then(() => {
          refresh();
          toast.success('Signed in successfully');
        })
        .catch((err) => {
          toast.error(err.message || 'Sign in failed');
        });
    }
  }, [isConnected, address, isAuthenticated, sessionLoading, siweLoading, signIn, refresh]);

  // Sign out when wallet disconnects
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      signOut().then(() => refresh());
    }
  }, [isConnected, isAuthenticated, signOut, refresh]);

  // Show loading state
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show connect wallet prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Arc Invoice</h1>
        <p className="text-muted-foreground">Connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  // Show signing state
  if (siweLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-pulse text-muted-foreground">Signing in...</div>
        <p className="text-sm text-muted-foreground">
          Please sign the message in your wallet
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileNav>{children}</MobileNav>
    </div>
  );
}

// Main layout wraps everything in Providers
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <AuthContent>{children}</AuthContent>
    </Providers>
  );
}
