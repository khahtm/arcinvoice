'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectButton } from '@/components/wallet/ConnectButton';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="border-b bg-background h-16 flex items-center px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden mr-2"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Image
        src="/logo.png"
        alt="Arc Invoice"
        width={160}
        height={40}
        className="h-10 w-auto"
      />
      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm">
          <Link href="/invoices/new">
            <Plus className="h-4 w-4 mr-1" />
            New Invoice
          </Link>
        </Button>
        <ConnectButton />
      </div>
    </header>
  );
}
