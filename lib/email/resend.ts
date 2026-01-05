import { Resend } from 'resend';

// Initialize Resend client - may be undefined if API key not set
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'noreply@arcinvoice.com';

export function isEmailEnabled(): boolean {
  return !!resend;
}
