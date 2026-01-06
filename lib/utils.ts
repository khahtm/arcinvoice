import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { nanoid } from 'nanoid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateShortCode(): string {
  return nanoid(8).toUpperCase();
}

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatUSDC(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getPaymentUrl(shortCode: string): string {
  // Use window.location.origin on client-side for correct full URL
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'https://arcinvoice.org';
  return `${baseUrl}/pay/${shortCode}`;
}
