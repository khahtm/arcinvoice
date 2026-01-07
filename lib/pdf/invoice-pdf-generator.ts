import jsPDF from 'jspdf';
import type { Invoice, Milestone } from '@/types/database';
import { formatUSDC, truncateAddress } from '@/lib/utils';

// Arc logo as base64
const ARC_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAd0AAACKCAYAAADvwZCVAAAACXBIWXMAAAdiAAAHYgE4epnbAAADZGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI2LTAxLTA1PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkV4dElkPmYxYmViNjU4LWRmMWItNGQzMy05OWEyLTU1NTZhNGMzMjE1ZjwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJz4KICA8ZGM6dGl0bGU+CiAgIDxyZGY6QWx0PgogICAgPHJkZjpsaSB4bWw6bGFuZz0neC1kZWZhdWx0Jz5Zb3VyIHBhcmFncmFwaCB0ZXh0IC0gMTwvcmRmOmxpPgogICA8L3JkZjpBbHQ+CiAgPC9kYzp0aXRsZT4KIDwvcmRmOkRlc2NyaXB0aW9uPgo8L3JkZjpSREY+Cjwv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';

// Professional color scheme
const COLORS = {
  primary: { r: 59, g: 130, b: 246 },      // Blue
  success: { r: 34, g: 197, b: 94 },       // Green
  warning: { r: 234, g: 179, b: 8 },       // Yellow
  dark: { r: 17, g: 24, b: 39 },           // Dark gray
  muted: { r: 107, g: 114, b: 128 },       // Gray
  light: { r: 243, g: 244, b: 246 },       // Light gray
  border: { r: 229, g: 231, b: 235 },      // Border gray
};

interface PdfInvoiceData {
  shortCode: string;
  amount: number;
  description: string;
  creatorWallet: string;
  clientName?: string | null;
  clientEmail?: string | null;
  paymentType: 'direct' | 'escrow';
  status: string;
  escrowAddress?: string | null;
  txHash?: string | null;
  autoReleaseDays?: number;
  createdAt: string;
  milestones?: Array<{
    description: string;
    amount: number;
    status: string;
  }>;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Generate professional PDF invoice
 */
export async function generateInvoicePdf(data: PdfInvoiceData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = MARGIN;

  // Header with logo and invoice title
  y = drawHeader(doc, data, y);

  // Invoice info box
  y = drawInvoiceInfoBox(doc, data, y);

  // Bill To / From section
  y = drawBillSection(doc, data, y);

  // Description
  y = drawDescriptionSection(doc, data, y);

  // Milestones (if any)
  if (data.milestones && data.milestones.length > 0) {
    y = drawMilestonesTable(doc, data.milestones, y);
  }

  // Payment info
  y = drawPaymentInfo(doc, data, y);

  // Total box
  drawTotalBox(doc, data, y);

  // Footer
  drawFooter(doc);

  return doc.output('blob');
}

function drawHeader(doc: jsPDF, data: PdfInvoiceData, y: number): number {
  // Logo
  try {
    doc.addImage(ARC_LOGO_BASE64, 'PNG', MARGIN, y, 45, 14);
  } catch {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    doc.text('Arc Invoice', MARGIN, y + 10);
  }

  // Invoice title with accent line
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text('INVOICE', PAGE_WIDTH - MARGIN, y + 10, { align: 'right' });

  // Accent line under title
  doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setLineWidth(0.8);
  doc.line(PAGE_WIDTH - MARGIN - 42, y + 14, PAGE_WIDTH - MARGIN, y + 14);

  return y + 25;
}

function drawInvoiceInfoBox(doc: jsPDF, data: PdfInvoiceData, y: number): number {
  const boxWidth = 70;
  const boxX = PAGE_WIDTH - MARGIN - boxWidth;

  // Box background
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(boxX, y, boxWidth, 28, 2, 2, 'F');

  // Invoice details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);

  doc.text('INVOICE #', boxX + 5, y + 7);
  doc.text('DATE', boxX + 5, y + 14);
  doc.text('STATUS', boxX + 5, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);

  doc.text(data.shortCode, boxX + 30, y + 7);
  doc.text(formatDate(data.createdAt), boxX + 30, y + 14);

  // Status badge
  const statusColor = getStatusColor(data.status);
  doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
  doc.roundedRect(boxX + 30, y + 17, 25, 6, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(data.status.toUpperCase(), boxX + 42.5, y + 21.5, { align: 'center' });

  return y + 35;
}

function drawBillSection(doc: jsPDF, data: PdfInvoiceData, y: number): number {
  const colWidth = CONTENT_WIDTH / 2;

  // Section headers with colored backgrounds
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.roundedRect(MARGIN, y, 30, 6, 1, 1, 'F');
  doc.roundedRect(MARGIN + colWidth, y, 30, 6, 1, 1, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FROM', MARGIN + 15, y + 4.2, { align: 'center' });
  doc.text('BILL TO', MARGIN + colWidth + 15, y + 4.2, { align: 'center' });

  y += 12;

  // From content
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text(truncateAddress(data.creatorWallet, 8), MARGIN, y);

  // To content
  let toY = y;
  if (data.clientName) {
    doc.setFont('helvetica', 'bold');
    doc.text(data.clientName, MARGIN + colWidth, toY);
    toY += 5;
    doc.setFont('helvetica', 'normal');
  }
  if (data.clientEmail) {
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text(data.clientEmail, MARGIN + colWidth, toY);
  }
  if (!data.clientName && !data.clientEmail) {
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text('Not specified', MARGIN + colWidth, toY);
  }

  y += 15;

  // Divider
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);

  return y + 8;
}

function drawDescriptionSection(doc: jsPDF, data: PdfInvoiceData, y: number): number {
  // Section header
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text('DESCRIPTION', MARGIN + 4, y + 5);

  y += 12;

  // Description text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);

  const lines = doc.splitTextToSize(data.description, CONTENT_WIDTH - 8);
  doc.text(lines, MARGIN + 4, y);

  y += lines.length * 5 + 10;

  return y;
}

function drawMilestonesTable(
  doc: jsPDF,
  milestones: PdfInvoiceData['milestones'],
  y: number
): number {
  if (!milestones || milestones.length === 0) return y;

  // Table header
  doc.setFillColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('#', MARGIN + 4, y + 5.5);
  doc.text('MILESTONE', MARGIN + 12, y + 5.5);
  doc.text('AMOUNT', PAGE_WIDTH - MARGIN - 35, y + 5.5);
  doc.text('STATUS', PAGE_WIDTH - MARGIN - 12, y + 5.5, { align: 'right' });

  y += 8;

  // Table rows
  milestones.forEach((m, i) => {
    const rowY = y + i * 10;
    const isEven = i % 2 === 0;

    // Row background
    if (isEven) {
      doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
      doc.rect(MARGIN, rowY, CONTENT_WIDTH, 10, 'F');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);

    // Number
    doc.text(`${i + 1}`, MARGIN + 4, rowY + 6.5);

    // Description (truncated)
    const desc = m.description.length > 45 ? m.description.slice(0, 42) + '...' : m.description;
    doc.text(desc, MARGIN + 12, rowY + 6.5);

    // Amount
    doc.text(formatUSDC(m.amount), PAGE_WIDTH - MARGIN - 35, rowY + 6.5);

    // Status badge
    const statusColor = getStatusColor(m.status);
    doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
    doc.roundedRect(PAGE_WIDTH - MARGIN - 20, rowY + 2.5, 16, 5, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(m.status.toUpperCase(), PAGE_WIDTH - MARGIN - 12, rowY + 6, { align: 'center' });
  });

  y += milestones.length * 10 + 8;

  return y;
}

function drawPaymentInfo(doc: jsPDF, data: PdfInvoiceData, y: number): number {
  // Section header
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text('PAYMENT INFORMATION', MARGIN + 4, y + 5);

  y += 12;

  const labelX = MARGIN + 4;
  const valueX = MARGIN + 45;

  doc.setFontSize(9);

  // Payment type
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text('Payment Type:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text(capitalize(data.paymentType), valueX, y);
  y += 6;

  // Auto-release (escrow only)
  if (data.paymentType === 'escrow' && data.autoReleaseDays) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text('Auto-release:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    doc.text(`${data.autoReleaseDays} days after funding`, valueX, y);
    y += 6;
  }

  // Escrow address
  if (data.escrowAddress) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text('Escrow Contract:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(truncateAddress(data.escrowAddress, 12), valueX, y);
    y += 6;
  }

  // Transaction hash
  if (data.txHash) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text('Transaction:', labelX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.text(truncateAddress(data.txHash, 14), valueX, y);
    y += 6;
  }

  return y + 8;
}

function drawTotalBox(doc: jsPDF, data: PdfInvoiceData, y: number): void {
  const boxWidth = 80;
  const boxHeight = 20;
  const boxX = PAGE_WIDTH - MARGIN - boxWidth;

  // Box with gradient effect (solid color)
  doc.setFillColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.roundedRect(boxX, y, boxWidth, boxHeight, 2, 2, 'F');

  // Total label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 200, 200);
  doc.text('TOTAL AMOUNT', boxX + 5, y + 8);

  // Total amount
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`${formatUSDC(data.amount)} USDC`, boxX + boxWidth - 5, y + 15, { align: 'right' });
}

function drawFooter(doc: jsPDF): void {
  const footerY = PAGE_HEIGHT - 20;

  // Divider line
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY, PAGE_WIDTH - MARGIN, footerY);

  // Footer text
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text('Powered by Arc Invoice', PAGE_WIDTH / 2, footerY + 6, { align: 'center' });
  doc.text('https://arcinvoice.org', PAGE_WIDTH / 2, footerY + 10, { align: 'center' });

  // Blockchain badge
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.roundedRect(PAGE_WIDTH - MARGIN - 35, footerY + 3, 35, 8, 1, 1, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BLOCKCHAIN VERIFIED', PAGE_WIDTH - MARGIN - 17.5, footerY + 8, { align: 'center' });
}

// Helper functions
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getStatusColor(status: string): { r: number; g: number; b: number } {
  switch (status.toLowerCase()) {
    case 'released':
      return COLORS.success;
    case 'funded':
      return COLORS.primary;
    case 'pending':
      return COLORS.warning;
    default:
      return COLORS.muted;
  }
}

/**
 * Convert Invoice + Milestones to PdfInvoiceData
 */
export function invoiceToPdfData(
  invoice: Invoice,
  milestones?: Milestone[]
): PdfInvoiceData {
  return {
    shortCode: invoice.short_code,
    amount: invoice.amount,
    description: invoice.description,
    creatorWallet: invoice.creator_wallet,
    clientName: invoice.client_name,
    clientEmail: invoice.client_email,
    paymentType: invoice.payment_type,
    status: invoice.status,
    escrowAddress: invoice.escrow_address,
    txHash: invoice.tx_hash,
    autoReleaseDays: invoice.auto_release_days,
    createdAt: invoice.created_at,
    milestones: milestones?.map((m) => ({
      description: m.description,
      amount: m.amount,
      status: m.status,
    })),
  };
}
