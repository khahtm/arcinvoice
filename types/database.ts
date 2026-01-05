export type PaymentType = 'direct' | 'escrow';
export type InvoiceStatus = 'draft' | 'pending' | 'funded' | 'released' | 'refunded';
export type MilestoneStatus = 'pending' | 'approved' | 'released';

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
  contract_version: number;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  invoice_id: string;
  order_index: number;
  amount: number;
  description: string;
  status: MilestoneStatus;
  released_at: string | null;
  created_at: string;
}

export interface MilestoneInput {
  amount: number;
  description: string;
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
  milestones?: MilestoneInput[];
}

// Dispute types
export type DisputeStatus = 'open' | 'proposed' | 'resolved' | 'escalated' | 'expired';
export type ResolutionType = 'refund' | 'release' | 'split';

export interface Dispute {
  id: string;
  invoice_id: string;
  opened_by: string;
  reason: string;
  status: DisputeStatus;
  resolution_type: ResolutionType | null;
  resolution_payer_amount: number | null;
  resolution_creator_amount: number | null;
  proposed_by: string | null;
  proposed_at: string | null;
  resolved_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  submitted_by: string;
  content: string;
  file_url: string | null;
  created_at: string;
}

export interface DisputeWithEvidence extends Dispute {
  evidence: DisputeEvidence[];
}

export interface ProposeResolutionInput {
  resolution_type: ResolutionType;
  payer_amount?: number;
  creator_amount?: number;
}
