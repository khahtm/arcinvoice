-- Kleros arbitration tracking
CREATE TABLE IF NOT EXISTS kleros_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID REFERENCES disputes(id) ON DELETE CASCADE,
    kleros_dispute_id TEXT, -- Kleros on-chain dispute ID
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'evidence', 'voting', 'appeal', 'resolved'
    )),
    ruling TEXT, -- 'payer', 'creator', 'split'
    payer_amount BIGINT,
    creator_amount BIGINT,
    arbitration_fee_eth TEXT, -- Fee paid in ETH
    arbitration_fee_paid_by TEXT, -- wallet address
    evidence_deadline TIMESTAMPTZ,
    ruling_at TIMESTAMPTZ,
    executed BOOLEAN DEFAULT false,
    executed_at TIMESTAMPTZ,
    executed_tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kleros evidence submissions
CREATE TABLE IF NOT EXISTS kleros_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES kleros_cases(id) ON DELETE CASCADE,
    submitted_by TEXT NOT NULL,
    evidence_uri TEXT NOT NULL, -- IPFS URI
    kleros_evidence_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kleros_cases_dispute ON kleros_cases(dispute_id);
CREATE INDEX idx_kleros_evidence_case ON kleros_evidence(case_id);

-- RLS policies
ALTER TABLE kleros_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE kleros_evidence ENABLE ROW LEVEL SECURITY;

-- Kleros cases: visible to invoice creator and payer
CREATE POLICY "kleros_cases_select" ON kleros_cases FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM disputes d
        JOIN invoices i ON d.invoice_id = i.id
        WHERE d.id = kleros_cases.dispute_id
        AND (i.creator_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    )
);

CREATE POLICY "kleros_cases_insert" ON kleros_cases FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM disputes d
        JOIN invoices i ON d.invoice_id = i.id
        WHERE d.id = dispute_id
        AND (i.creator_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    )
);

-- Kleros evidence: same visibility as cases
CREATE POLICY "kleros_evidence_select" ON kleros_evidence FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM kleros_cases kc
        JOIN disputes d ON kc.dispute_id = d.id
        JOIN invoices i ON d.invoice_id = i.id
        WHERE kc.id = kleros_evidence.case_id
        AND (i.creator_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    )
);

CREATE POLICY "kleros_evidence_insert" ON kleros_evidence FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM kleros_cases kc
        JOIN disputes d ON kc.dispute_id = d.id
        JOIN invoices i ON d.invoice_id = i.id
        WHERE kc.id = case_id
        AND (i.creator_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    )
);
