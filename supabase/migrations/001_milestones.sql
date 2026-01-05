-- Migration: Add milestones table for Phase B
-- Run this in Supabase SQL Editor

-- Create milestones table
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    amount BIGINT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'released')),
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(invoice_id, order_index)
);

-- Enable RLS
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Anyone can view milestones (needed for payment page)
CREATE POLICY "milestones_select_all" ON milestones FOR SELECT USING (true);

-- Creators can insert milestones for their invoices
CREATE POLICY "milestones_insert_creator" ON milestones FOR INSERT
WITH CHECK (
    invoice_id IN (
        SELECT id FROM invoices
        WHERE creator_wallet = (
            SELECT current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    )
);

-- Allow updates to milestone status (for approve/release flow)
CREATE POLICY "milestones_update_status" ON milestones FOR UPDATE USING (true);

-- Index for fast lookup by invoice
CREATE INDEX IF NOT EXISTS idx_milestones_invoice_id ON milestones(invoice_id);

-- Add contract_version to invoices if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'contract_version'
    ) THEN
        ALTER TABLE invoices ADD COLUMN contract_version INT DEFAULT 1;
    END IF;
END $$;
