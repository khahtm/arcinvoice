'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  onClick: () => void;
}

export function ExportButton({ onClick }: ExportButtonProps) {
  return (
    <Button variant="outline" onClick={onClick}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
