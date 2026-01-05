-- Migration: Add disputes tables for Phase C
-- Run this in Supabase SQL Editor

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    opened_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'proposed', 'resolved', 'escalated', 'expired')),
    resolution_type TEXT CHECK (resolution_type IN ('refund', 'release', 'split')),
    resolution_payer_amount BIGINT,
    resolution_creator_amount BIGINT,
    proposed_by TEXT,
    proposed_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence table
CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE,
    submitted_by TEXT NOT NULL,
    content TEXT NOT NULL,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disputes_invoice_id ON disputes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);

-- RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;

-- Anyone can view disputes (needed for payment page)
CREATE POLICY "disputes_select_all" ON disputes FOR SELECT USING (true);
CREATE POLICY "disputes_insert_parties" ON disputes FOR INSERT WITH CHECK (true);
CREATE POLICY "disputes_update_parties" ON disputes FOR UPDATE USING (true);

CREATE POLICY "evidence_select_all" ON dispute_evidence FOR SELECT USING (true);
CREATE POLICY "evidence_insert_parties" ON dispute_evidence FOR INSERT WITH CHECK (true);
