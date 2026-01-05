# Phase D: Notifications

## Context

- Plan: [plan.md](./plan.md)
- Depends on: [Phase C](./phase-C-dispute-resolution-v1.md)

## Overview

- **Priority:** P2
- **Status:** Planned
- **Effort:** 0.5 weeks (3 days)

Implement email notifications for key payment events using Resend.

## Requirements

### Functional
- Email notifications for payment events
- User email collection and verification
- Notification preferences (opt-in/out)
- In-app notification center

### Non-Functional
- Reliable email delivery (Resend)
- Queue for retries
- Unsubscribe links in emails

## Notification Events

| Event | Recipients | Email | In-App |
|-------|------------|-------|--------|
| Invoice created | Creator | ✓ | ✓ |
| Payment received (direct) | Creator | ✓ | ✓ |
| Escrow funded | Creator, Payer | ✓ | ✓ |
| Milestone approved | Creator | ✓ | ✓ |
| Milestone released | Creator, Payer | ✓ | ✓ |
| Funds released | Creator, Payer | ✓ | ✓ |
| Dispute opened | Creator, Payer | ✓ | ✓ |
| Resolution proposed | Counter-party | ✓ | ✓ |
| Dispute resolved | Both | ✓ | ✓ |

## Database Schema

```sql
-- Notification preferences
CREATE TABLE notification_preferences (
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

-- In-app notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    invoice_id UUID REFERENCES invoices(id),
    read BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_wallet ON notifications(wallet_address, read, created_at DESC);
CREATE INDEX idx_notification_prefs_wallet ON notification_preferences(wallet_address);
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/email/resend.ts` | Create | Resend client setup |
| `lib/email/templates.ts` | Create | Email templates |
| `lib/notifications.ts` | Create | Notification service |
| `app/api/notifications/route.ts` | Create | GET notifications |
| `app/api/notifications/preferences/route.ts` | Create | GET, PATCH preferences |
| `app/api/notifications/verify-email/route.ts` | Create | Email verification |
| `hooks/useNotifications.ts` | Create | Fetch notifications |
| `components/notifications/NotificationBell.tsx` | Create | Header bell icon |
| `components/notifications/NotificationDropdown.tsx` | Create | Dropdown list |
| `components/notifications/EmailPreferences.tsx` | Create | Settings form |
| `app/(auth)/settings/page.tsx` | Modify | Add email settings |

## Implementation Steps

### Step 1: Install Resend (0.25 days)

```bash
npm install resend
```

Add to `.env.local`:
```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=notifications@arcinvoice.com
```

### Step 2: Email Client Setup (0.25 days)

Create `lib/email/resend.ts`:

```typescript
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@arcinvoice.com';
```

Create `lib/email/templates.ts`:

```typescript
import { formatUSDC } from '@/lib/utils';

export interface EmailTemplate {
  subject: string;
  html: string;
}

export function paymentReceivedEmail(
  invoiceCode: string,
  amount: number,
  payerAddress: string
): EmailTemplate {
  return {
    subject: `Payment received for invoice ${invoiceCode}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Payment Received!</h1>
        <p>Great news! Your invoice <strong>${invoiceCode}</strong> has been paid.</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Amount:</strong> ${formatUSDC(amount)}</p>
          <p style="margin: 10px 0 0;"><strong>From:</strong> ${payerAddress.slice(0, 6)}...${payerAddress.slice(-4)}</p>
        </div>

        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
           style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Dashboard
        </a>

        <p style="color: #666; font-size: 12px; margin-top: 40px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings">Manage notification preferences</a>
        </p>
      </div>
    `,
  };
}

export function escrowFundedEmail(
  invoiceCode: string,
  amount: number,
  role: 'creator' | 'payer'
): EmailTemplate {
  const message = role === 'creator'
    ? 'Your escrow invoice has been funded! The payer has deposited funds.'
    : 'You have successfully funded the escrow. Funds are now held securely.';

  return {
    subject: `Escrow funded for invoice ${invoiceCode}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Escrow Funded</h1>
        <p>${message}</p>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Invoice:</strong> ${invoiceCode}</p>
          <p style="margin: 10px 0 0;"><strong>Amount:</strong> ${formatUSDC(amount)}</p>
        </div>

        <a href="${process.env.NEXT_PUBLIC_APP_URL}/invoices"
           style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          View Invoice
        </a>
      </div>
    `,
  };
}

export function disputeOpenedEmail(
  invoiceCode: string,
  reason: string,
  role: 'creator' | 'payer'
): EmailTemplate {
  return {
    subject: `Dispute opened for invoice ${invoiceCode}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Dispute Opened</h1>
        <p>A dispute has been opened for invoice <strong>${invoiceCode}</strong>.</p>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0;"><strong>Reason:</strong></p>
          <p style="margin: 10px 0 0;">${reason}</p>
        </div>

        <p>Please review and respond within 7 days.</p>

        <a href="${process.env.NEXT_PUBLIC_APP_URL}/invoices"
           style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Respond to Dispute
        </a>
      </div>
    `,
  };
}

export function emailVerificationEmail(token: string): EmailTemplate {
  return {
    subject: 'Verify your email - Arc Invoice',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Verify Your Email</h1>
        <p>Click the button below to verify your email and receive notifications.</p>

        <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/verify-email?token=${token}"
           style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Verify Email
        </a>

        <p style="color: #666; font-size: 12px;">
          This link expires in 24 hours. If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  };
}
```

### Step 3: Notification Service (0.5 days)

Create `lib/notifications.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import * as templates from '@/lib/email/templates';

type NotificationType =
  | 'invoice_created'
  | 'payment_received'
  | 'escrow_funded'
  | 'milestone_approved'
  | 'milestone_released'
  | 'funds_released'
  | 'dispute_opened'
  | 'resolution_proposed'
  | 'dispute_resolved';

interface SendNotificationParams {
  walletAddress: string;
  type: NotificationType;
  title: string;
  body: string;
  invoiceId?: string;
  emailTemplate?: templates.EmailTemplate;
}

export async function sendNotification({
  walletAddress,
  type,
  title,
  body,
  invoiceId,
  emailTemplate,
}: SendNotificationParams) {
  const supabase = createAdminClient();

  // Create in-app notification
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      wallet_address: walletAddress,
      type,
      title,
      body,
      invoice_id: invoiceId,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create notification:', error);
    return;
  }

  // Check email preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('email, email_verified, notify_payment_received, notify_escrow_funded, notify_milestone_approved, notify_dispute_opened')
    .eq('wallet_address', walletAddress)
    .single();

  if (!prefs?.email || !prefs.email_verified) {
    return notification;
  }

  // Check if this notification type is enabled
  const prefKey = `notify_${type.split('_')[0]}` as keyof typeof prefs;
  if (prefs[prefKey] === false) {
    return notification;
  }

  // Send email if template provided
  if (emailTemplate) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: prefs.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      });

      // Mark email as sent
      await supabase
        .from('notifications')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', notification.id);
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  }

  return notification;
}

// Convenience functions
export async function notifyPaymentReceived(
  creatorWallet: string,
  invoiceCode: string,
  amount: number,
  payerAddress: string,
  invoiceId: string
) {
  return sendNotification({
    walletAddress: creatorWallet,
    type: 'payment_received',
    title: 'Payment received',
    body: `Invoice ${invoiceCode} paid: ${(amount / 1_000_000).toFixed(2)} USDC`,
    invoiceId,
    emailTemplate: templates.paymentReceivedEmail(invoiceCode, amount, payerAddress),
  });
}

export async function notifyEscrowFunded(
  walletAddress: string,
  role: 'creator' | 'payer',
  invoiceCode: string,
  amount: number,
  invoiceId: string
) {
  return sendNotification({
    walletAddress,
    type: 'escrow_funded',
    title: 'Escrow funded',
    body: `Invoice ${invoiceCode} escrow funded with ${(amount / 1_000_000).toFixed(2)} USDC`,
    invoiceId,
    emailTemplate: templates.escrowFundedEmail(invoiceCode, amount, role),
  });
}

export async function notifyDisputeOpened(
  walletAddress: string,
  role: 'creator' | 'payer',
  invoiceCode: string,
  reason: string,
  invoiceId: string
) {
  return sendNotification({
    walletAddress,
    type: 'dispute_opened',
    title: 'Dispute opened',
    body: `Dispute opened for invoice ${invoiceCode}`,
    invoiceId,
    emailTemplate: templates.disputeOpenedEmail(invoiceCode, reason, role),
  });
}
```

### Step 4: API Routes (0.5 days)

Create `app/api/notifications/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';

  const supabase = await createClient();

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ notifications: data });
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { ids, markAllRead } = body;

  const supabase = await createClient();

  if (markAllRead) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('wallet_address', walletAddress)
      .eq('read', false);
  } else if (ids?.length) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .in('id', ids);
  }

  return Response.json({ success: true });
}
```

Create `app/api/notifications/preferences/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { emailVerificationEmail } from '@/lib/email/templates';
import { nanoid } from 'nanoid';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ preferences: data || { wallet_address: walletAddress } });
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const walletAddress = cookieStore.get('wallet-address')?.value;

  if (!walletAddress) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const supabase = await createClient();

  // Check if email changed
  if (body.email) {
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('email')
      .eq('wallet_address', walletAddress)
      .single();

    if (!existing || existing.email !== body.email) {
      // New email - send verification
      const token = nanoid(32);

      body.email_verified = false;
      body.email_verification_token = token;
      body.email_verification_sent_at = new Date().toISOString();

      // Send verification email
      try {
        const template = emailVerificationEmail(token);
        await resend.emails.send({
          from: FROM_EMAIL,
          to: body.email,
          subject: template.subject,
          html: template.html,
        });
      } catch (err) {
        console.error('Failed to send verification:', err);
      }
    }
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      wallet_address: walletAddress,
      ...body,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ preferences: data });
}
```

Create `app/api/notifications/verify-email/route.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return redirect('/settings?error=invalid_token');
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('notification_preferences')
    .update({
      email_verified: true,
      email_verification_token: null,
    })
    .eq('email_verification_token', token)
    .select()
    .single();

  if (error || !data) {
    return redirect('/settings?error=invalid_token');
  }

  return redirect('/settings?email_verified=true');
}
```

### Step 5: UI Components (1 day)

Create `components/notifications/NotificationBell.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          onClose={() => setOpen(false)}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllRead}
        />
      )}
    </div>
  );
}
```

Create `hooks/useNotifications.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  invoice_id: string | null;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (ids: string[]) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    );
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return {
    notifications,
    isLoading,
    unreadCount,
    refetch: fetchNotifications,
    markAsRead,
    markAllRead,
  };
}
```

### Step 6: Trigger Notifications (0.5 days)

Update API routes to trigger notifications:

Example in `app/api/invoices/[id]/route.ts` PATCH:

```typescript
import { notifyPaymentReceived, notifyEscrowFunded } from '@/lib/notifications';

// After successful payment status update:
if (status === 'released' && invoice.payment_type === 'direct') {
  await notifyPaymentReceived(
    invoice.creator_wallet,
    invoice.short_code,
    invoice.amount,
    walletAddress,
    invoice.id
  );
}

if (status === 'funded') {
  await notifyEscrowFunded(
    invoice.creator_wallet,
    'creator',
    invoice.short_code,
    invoice.amount,
    invoice.id
  );
}
```

## Todo List

- [ ] Install resend package
- [ ] Add RESEND_API_KEY to env
- [ ] Run database migration
- [ ] Create lib/email/resend.ts
- [ ] Create lib/email/templates.ts
- [ ] Create lib/notifications.ts
- [ ] Create notifications GET/PATCH API
- [ ] Create preferences GET/PATCH API
- [ ] Create verify-email route
- [ ] Create useNotifications hook
- [ ] Create NotificationBell component
- [ ] Create NotificationDropdown component
- [ ] Create EmailPreferences component
- [ ] Add NotificationBell to Header
- [ ] Add EmailPreferences to Settings
- [ ] Trigger notifications in payment APIs
- [ ] Test email delivery

## Success Criteria

- [ ] Users can add email address
- [ ] Email verification works
- [ ] In-app notifications appear
- [ ] Email sent for enabled events
- [ ] Preferences save correctly
- [ ] Unsubscribe works

## Next Steps

After completion, proceed to Phase E: Analytics
