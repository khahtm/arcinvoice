import { formatUSDC } from '@/lib/utils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://arcinvoice.com';

export interface EmailTemplate {
  subject: string;
  html: string;
}

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const buttonStyles = `
  display: inline-block;
  background: #000;
  color: #fff;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 6px;
  margin: 20px 0;
`;

const cardStyles = `
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
`;

export function paymentReceivedEmail(
  invoiceCode: string,
  amount: number,
  payerAddress: string
): EmailTemplate {
  return {
    subject: `Payment received for invoice ${invoiceCode}`,
    html: `
      <div style="${baseStyles}">
        <h1 style="color: #1a1a1a;">Payment Received!</h1>
        <p>Great news! Your invoice <strong>${invoiceCode}</strong> has been paid.</p>

        <div style="${cardStyles}">
          <p style="margin: 0;"><strong>Amount:</strong> ${formatUSDC(amount)}</p>
          <p style="margin: 10px 0 0;"><strong>From:</strong> ${payerAddress.slice(0, 6)}...${payerAddress.slice(-4)}</p>
        </div>

        <a href="${APP_URL}/dashboard" style="${buttonStyles}">
          View Dashboard
        </a>

        <p style="color: #666; font-size: 12px; margin-top: 40px;">
          <a href="${APP_URL}/settings">Manage notification preferences</a>
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
  const message =
    role === 'creator'
      ? 'Your escrow invoice has been funded! The payer has deposited funds.'
      : 'You have successfully funded the escrow. Funds are now held securely.';

  return {
    subject: `Escrow funded for invoice ${invoiceCode}`,
    html: `
      <div style="${baseStyles}">
        <h1 style="color: #1a1a1a;">Escrow Funded</h1>
        <p>${message}</p>

        <div style="${cardStyles}">
          <p style="margin: 0;"><strong>Invoice:</strong> ${invoiceCode}</p>
          <p style="margin: 10px 0 0;"><strong>Amount:</strong> ${formatUSDC(amount)}</p>
        </div>

        <a href="${APP_URL}/invoices" style="${buttonStyles}">
          View Invoice
        </a>

        <p style="color: #666; font-size: 12px; margin-top: 40px;">
          <a href="${APP_URL}/settings">Manage notification preferences</a>
        </p>
      </div>
    `,
  };
}

export function milestoneApprovedEmail(
  invoiceCode: string,
  milestoneIndex: number,
  amount: number
): EmailTemplate {
  return {
    subject: `Milestone ${milestoneIndex + 1} approved for invoice ${invoiceCode}`,
    html: `
      <div style="${baseStyles}">
        <h1 style="color: #1a1a1a;">Milestone Approved!</h1>
        <p>Milestone ${milestoneIndex + 1} for invoice <strong>${invoiceCode}</strong> has been approved.</p>

        <div style="${cardStyles}">
          <p style="margin: 0;"><strong>Milestone:</strong> #${milestoneIndex + 1}</p>
          <p style="margin: 10px 0 0;"><strong>Amount:</strong> ${formatUSDC(amount)}</p>
        </div>

        <p>You can now release this milestone to receive funds.</p>

        <a href="${APP_URL}/invoices" style="${buttonStyles}">
          Release Funds
        </a>
      </div>
    `,
  };
}

export function disputeOpenedEmail(
  invoiceCode: string,
  reason: string,
  _role: 'creator' | 'payer'
): EmailTemplate {
  return {
    subject: `Dispute opened for invoice ${invoiceCode}`,
    html: `
      <div style="${baseStyles}">
        <h1 style="color: #dc2626;">Dispute Opened</h1>
        <p>A dispute has been opened for invoice <strong>${invoiceCode}</strong>.</p>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0;"><strong>Reason:</strong></p>
          <p style="margin: 10px 0 0;">${reason}</p>
        </div>

        <p>Please review and respond within 7 days.</p>

        <a href="${APP_URL}/invoices" style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Respond to Dispute
        </a>

        <p style="color: #666; font-size: 12px; margin-top: 40px;">
          <a href="${APP_URL}/settings">Manage notification preferences</a>
        </p>
      </div>
    `,
  };
}

export function resolutionProposedEmail(
  invoiceCode: string,
  resolutionType: string
): EmailTemplate {
  return {
    subject: `Resolution proposed for dispute on ${invoiceCode}`,
    html: `
      <div style="${baseStyles}">
        <h1 style="color: #1a1a1a;">Resolution Proposed</h1>
        <p>A resolution has been proposed for the dispute on invoice <strong>${invoiceCode}</strong>.</p>

        <div style="${cardStyles}">
          <p style="margin: 0;"><strong>Type:</strong> ${resolutionType}</p>
        </div>

        <p>Please review and accept or reject the proposal.</p>

        <a href="${APP_URL}/invoices" style="${buttonStyles}">
          Review Proposal
        </a>
      </div>
    `,
  };
}

export function emailVerificationEmail(token: string): EmailTemplate {
  return {
    subject: 'Verify your email - Arc Invoice',
    html: `
      <div style="${baseStyles}">
        <h1 style="color: #1a1a1a;">Verify Your Email</h1>
        <p>Click the button below to verify your email and receive notifications.</p>

        <a href="${APP_URL}/api/notifications/verify-email?token=${token}" style="${buttonStyles}">
          Verify Email
        </a>

        <p style="color: #666; font-size: 12px;">
          This link expires in 24 hours. If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  };
}
