export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'funded'
  | 'released'
  | 'refunded';

export type PaymentType = 'direct' | 'escrow';

export interface Invoice {
  id: string;
  short_code: string;
  creator_wallet: string;
  amount: number;
  description: string;
  client_name?: string;
  client_email?: string;
  payment_type: PaymentType;
  status: InvoiceStatus;
  escrow_address?: string;
  auto_release_days?: number;
  tx_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceInput {
  amount: number;
  description: string;
  client_name?: string;
  client_email?: string;
  payment_type: PaymentType;
  auto_release_days?: number;
}
