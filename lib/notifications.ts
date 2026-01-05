import { createAdminClient } from '@/lib/supabase/admin';
import { resend, FROM_EMAIL, isEmailEnabled } from '@/lib/email/resend';
import * as templates from '@/lib/email/templates';

export type NotificationType =
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
    return null;
  }

  // Check if email is enabled and user has verified email
  if (!isEmailEnabled() || !emailTemplate) {
    return notification;
  }

  // Check email preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (!prefs?.email || !prefs.email_verified) {
    return notification;
  }

  // Check if this notification type is enabled
  const prefMapping: Record<string, string> = {
    payment_received: 'notify_payment_received',
    escrow_funded: 'notify_escrow_funded',
    milestone_approved: 'notify_milestone_approved',
    milestone_released: 'notify_milestone_approved',
    dispute_opened: 'notify_dispute_opened',
    resolution_proposed: 'notify_dispute_opened',
    dispute_resolved: 'notify_dispute_opened',
  };

  const prefKey = prefMapping[type];
  if (prefKey && prefs[prefKey] === false) {
    return notification;
  }

  // Send email
  try {
    await resend!.emails.send({
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

  return notification;
}

// Convenience functions for common notifications

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
    emailTemplate: templates.paymentReceivedEmail(
      invoiceCode,
      amount,
      payerAddress
    ),
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

export async function notifyMilestoneApproved(
  creatorWallet: string,
  invoiceCode: string,
  milestoneIndex: number,
  amount: number,
  invoiceId: string
) {
  return sendNotification({
    walletAddress: creatorWallet,
    type: 'milestone_approved',
    title: 'Milestone approved',
    body: `Milestone ${milestoneIndex + 1} approved for ${invoiceCode}`,
    invoiceId,
    emailTemplate: templates.milestoneApprovedEmail(
      invoiceCode,
      milestoneIndex,
      amount
    ),
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

export async function notifyResolutionProposed(
  walletAddress: string,
  invoiceCode: string,
  resolutionType: string,
  invoiceId: string
) {
  return sendNotification({
    walletAddress,
    type: 'resolution_proposed',
    title: 'Resolution proposed',
    body: `A ${resolutionType} resolution has been proposed for ${invoiceCode}`,
    invoiceId,
    emailTemplate: templates.resolutionProposedEmail(
      invoiceCode,
      resolutionType
    ),
  });
}
