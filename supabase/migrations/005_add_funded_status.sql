-- Migration: Add 'funded' status for V3 pay-per-milestone escrow
-- Run this in Supabase SQL Editor

-- Drop existing constraint and add new one with 'funded' status
ALTER TABLE milestones DROP CONSTRAINT IF EXISTS milestones_status_check;
ALTER TABLE milestones ADD CONSTRAINT milestones_status_check
  CHECK (status IN ('pending', 'funded', 'approved', 'released'));

-- Add funded_at timestamp column for tracking when milestone was funded
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ;
