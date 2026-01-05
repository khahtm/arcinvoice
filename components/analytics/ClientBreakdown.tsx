import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatUSDC } from '@/lib/utils';

interface ClientBreakdownProps {
  clients: Array<{
    client: string;
    invoiceCount: number;
    totalPaid: number;
  }>;
}

export function ClientBreakdown({ clients }: ClientBreakdownProps) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Top Clients</h3>

      {clients.length === 0 ? (
        <p className="text-muted-foreground">No client data yet</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.client}>
                <TableCell className="max-w-48 truncate">{client.client}</TableCell>
                <TableCell className="text-right">{client.invoiceCount}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatUSDC(client.totalPaid)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
