'use client';

import { useState, useEffect, useCallback } from 'react';

interface Session {
  address: string | null;
}

export function useSession() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data: Session = await res.json();
      setWalletAddress(data.address);
    } catch {
      setWalletAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data: Session = await res.json();
        if (mounted) {
          setWalletAddress(data.address);
          setIsLoading(false);
        }
      } catch {
        if (mounted) {
          setWalletAddress(null);
          setIsLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    walletAddress,
    isLoading,
    isAuthenticated: !!walletAddress,
    refresh,
  };
}
