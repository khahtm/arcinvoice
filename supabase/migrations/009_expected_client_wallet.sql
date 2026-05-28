-- Migration 009: Pin an expected client wallet at deal creation
-- Additive only. Distinct from client_wallet (who actually signed) —
-- expected_client_wallet records who is ALLOWED to sign, enforced on-chain.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS expected_client_wallet TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_expected_client_wallet
  ON invoices(expected_client_wallet) WHERE expected_client_wallet IS NOT NULL;
