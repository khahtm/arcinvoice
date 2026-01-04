export type PaymentType = 'direct' | 'escrow';
export type InvoiceStatus = 'draft' | 'pending' | 'funded' | 'released' | 'refunded';

export interface Invoice {
  id: string;
  short_code: string;
  creator_wallet: string;
  amount: number;
  description: string;
  payment_type: PaymentType;
  client_name: string | null;
  client_email: string | null;
  status: InvoiceStatus;
  escrow_address: string | null;
  auto_release_days: number;
  funded_at: string | null;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'updated_at'>;
export type InvoiceUpdate = Partial<InvoiceInsert>;

export interface CreateInvoiceInput {
  amount: number;
  description: string;
  client_name?: string;
  client_email?: string;
  payment_type: PaymentType;
  auto_release_days?: number;
}
