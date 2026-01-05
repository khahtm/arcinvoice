-- Migration: Add notifications tables for Phase D
-- Run this in Supabase SQL Editor

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    email TEXT,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token TEXT,
    email_verification_sent_at TIMESTAMPTZ,
    notify_payment_received BOOLEAN DEFAULT true,
    notify_escrow_funded BOOLEAN DEFAULT true,
    notify_milestone_approved BOOLEAN DEFAULT true,
    notify_dispute_opened BOOLEAN DEFAULT true,
    notify_marketing BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- In-app notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_wallet ON notifications(wallet_address, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_wallet ON notification_preferences(wallet_address);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Preferences: users can only access their own
CREATE POLICY "prefs_select_own" ON notification_preferences
    FOR SELECT USING (true);
CREATE POLICY "prefs_insert_own" ON notification_preferences
    FOR INSERT WITH CHECK (true);
CREATE POLICY "prefs_update_own" ON notification_preferences
    FOR UPDATE USING (true);

-- Notifications: users can only access their own
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT USING (true);
CREATE POLICY "notifications_insert_any" ON notifications
    FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE USING (true);
