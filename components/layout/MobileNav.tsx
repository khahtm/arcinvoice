'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NetworkWarningBanner } from '@/components/wallet/NetworkWarningBanner';

interface MobileNavProps {
  children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <NetworkWarningBanner />
      <Header onMenuClick={() => setOpen(true)} />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Arc Invoice</SheetTitle>
          </SheetHeader>
          <Sidebar className="border-r-0" onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
        <Sidebar className="hidden md:flex min-h-full" />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </>
  );
}
