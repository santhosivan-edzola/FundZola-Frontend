import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, numberToWords } from './formatters';

// EdZola brand palette (RGB)
const CORAL   = [232, 150, 122]; // #E8967A
const TEAL    = [142, 207, 202]; // #8ECFCA
const DARK    = [26,  26,  26];  // #1A1A1A
const CREAM   = [245, 240, 235]; // #F5F0EB
const PEACH   = [250, 232, 220]; // #FAE8DC
const MUTED   = [120, 113, 108]; // warm grey
const WHITE   = [255, 255, 255];
const BORDER  = [220, 210, 200]; // warm border

export function generateReceipt(donation, donor, orgSettings) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // ── Dark header band ──────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageWidth, 52, 'F');

  // Coral left accent bar
  doc.setFillColor(...CORAL);
  doc.rect(0, 0, 5, 52, 'F');

  // Org name
  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(orgSettings?.orgName || 'Organization Name', pageWidth / 2, 16, { align: 'center' });

  // Org address / contact
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PEACH);
  const addressLine = [orgSettings?.address, orgSettings?.city, orgSettings?.state, orgSettings?.pincode]
    .filter(Boolean).join(', ');
  if (addressLine) doc.text(addressLine, pageWidth / 2, 24, { align: 'center' });

  const contactLine = [orgSettings?.phone, orgSettings?.email].filter(Boolean).join('   |   ');
  if (contactLine) doc.text(contactLine, pageWidth / 2, 30, { align: 'center' });

  // Reg / 80G numbers
  const regLine = [
    orgSettings?.registrationNumber ? `Reg. No.: ${orgSettings.registrationNumber}` : '',
    orgSettings?.pan80G ? `80G No.: ${orgSettings.pan80G}` : '',
  ].filter(Boolean).join('     |     ');
  if (regLine) {
    doc.setFontSize(8);
    doc.setTextColor(...TEAL);
    doc.text(regLine, pageWidth / 2, 37, { align: 'center' });
  }

  // Teal bottom accent line on header
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(1);
  doc.line(0, 52, pageWidth, 52);

  // ── Receipt title block ───────────────────────────────────────────
  let y = 62;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...CORAL);
  doc.text('DONATION RECEIPT', pageWidth / 2, y, { align: 'center' });

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...MUTED);
  doc.text('Under Section 80G of the Income Tax Act, 1961', pageWidth / 2, y, { align: 'center' });

  // Divider — coral + teal two-tone
  y += 5;
  doc.setDrawColor(...CORAL);
  doc.setLineWidth(1.2);
  doc.line(margin, y, pageWidth / 2, y);
  doc.setDrawColor(...TEAL);
  doc.line(pageWidth / 2, y, pageWidth - margin, y);

  // Receipt No. & Date pill row
  y += 7;
  // Left pill: receipt number
  doc.setFillColor(...PEACH);
  doc.roundedRect(margin, y - 4, 72, 8, 2, 2, 'F');
  doc.setDrawColor(...CORAL);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y - 4, 72, 8, 2, 2, 'S');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Receipt No.:', margin + 3, y + 0.5);
  doc.setTextColor(...CORAL);
  doc.text(donation.receiptNumber || donation.receipt_number || 'DRAFT', margin + 30, y + 0.5);

  // Right pill: date
  doc.setFillColor(...PEACH);
  doc.roundedRect(pageWidth - margin - 65, y - 4, 65, 8, 2, 2, 'F');
  doc.setDrawColor(...CORAL);
  doc.roundedRect(pageWidth - margin - 65, y - 4, 65, 8, 2, 2, 'S');
  doc.setTextColor(...DARK);
  doc.text('Date:', pageWidth - margin - 62, y + 0.5);
  doc.setTextColor(...CORAL);
  doc.text(formatDate(donation.date || donation.donation_date), pageWidth - margin - 3, y + 0.5, { align: 'right' });

  // ── DONOR DETAILS section ─────────────────────────────────────────
  y += 13;
  // Section label with left coral bar
  doc.setFillColor(...CORAL);
  doc.rect(margin, y - 3, 2.5, 7, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('DONOR DETAILS', margin + 5, y + 1.5);

  y += 5;
  const donorRows = [
    ['Donor Name',  donor?.name       || '-'],
    ['Address',     donor?.address    || '-'],
    ['PAN Number',  donor?.pan || donor?.pan_number || '-'],
    ['Email',       donor?.email      || '-'],
    ['Phone',       donor?.phone      || '-'],
    ['Donor Type',  donor?.donorType  || donor?.donor_type || '-'],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: donorRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9.5, cellPadding: 3.5, lineColor: BORDER, lineWidth: 0.3 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: CREAM, textColor: DARK, cellWidth: 48 },
      1: { fillColor: WHITE, textColor: DARK },
    },
    theme: 'grid',
  });

  // ── DONATION DETAILS section ──────────────────────────────────────
  y = doc.lastAutoTable.finalY + 9;
  doc.setFillColor(...TEAL);
  doc.rect(margin, y - 3, 2.5, 7, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('DONATION DETAILS', margin + 5, y + 1.5);

  y += 5;
  const donationRows = [
    ['Amount (Figures)', formatCurrency(donation.amount)],
    ['Amount (Words)',   numberToWords(donation.amount)],
    ['Date of Donation', formatDate(donation.date || donation.donation_date)],
    ['Payment Mode',    donation.paymentMode || donation.payment_mode || '-'],
    ...(donation.chequeNumber || donation.cheque_number
      ? [['Cheque / Ref. No.', donation.chequeNumber || donation.cheque_number]]
      : []),
    ...(donation.bankName || donation.bank_name
      ? [['Bank Name', donation.bankName || donation.bank_name]]
      : []),
    ['Fund Category',   donation.fundCategory || donation.fund_category || '-'],
    ['Purpose',         donation.purpose || 'General Charitable Purposes'],
    ['80G Eligible',    (donation.is80G || donation.is_80g_eligible) ? 'Yes — Eligible for tax deduction' : 'No'],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: donationRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9.5, cellPadding: 3.5, lineColor: BORDER, lineWidth: 0.3 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: CREAM, textColor: DARK, cellWidth: 48 },
      1: { fillColor: WHITE, textColor: DARK },
    },
    theme: 'grid',
  });

  // ── Certificate box ───────────────────────────────────────────────
  y = doc.lastAutoTable.finalY + 8;
  const certBoxH = 20;
  doc.setFillColor(...PEACH);
  doc.roundedRect(margin, y, contentWidth, certBoxH, 3, 3, 'F');
  doc.setDrawColor(...CORAL);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, certBoxH, 3, 3, 'S');

  // Small coral tag on left
  doc.setFillColor(...CORAL);
  doc.roundedRect(margin, y, 6, certBoxH, 3, 3, 'F');
  doc.rect(margin + 3, y, 3, certBoxH, 'F'); // square off right side

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...DARK);
  const certText =
    'Certified that this donation has been received and will be utilized exclusively for charitable purposes in accordance with the objects of the organization. This receipt qualifies for exemption under Section 80G of the Income Tax Act, 1961.';
  const splitCert = doc.splitTextToSize(certText, contentWidth - 16);
  doc.text(splitCert, margin + 9, y + 6.5);

  // ── Signatory area ────────────────────────────────────────────────
  y += certBoxH + 12;
  const sigBoxX = pageWidth - margin - 62;
  const sigBoxW = 62;

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.8);
  doc.line(sigBoxX, y, sigBoxX + sigBoxW, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(orgSettings?.signatory || 'Authorized Signatory', sigBoxX + sigBoxW / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(orgSettings?.signatoryDesignation || 'Authorized Signatory', sigBoxX + sigBoxW / 2, y + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text(orgSettings?.orgName || '', sigBoxX + sigBoxW / 2, y + 15, { align: 'center' });

  // Seal placeholder circle (teal outline)
  const sealX = margin + 20;
  const sealY = y + 5;
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.circle(sealX, sealY, 10, 'S');
  doc.setFontSize(6);
  doc.setTextColor(...TEAL);
  doc.text('SEAL', sealX, sealY + 1.5, { align: 'center' });

  // ── Footer band ───────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, pageHeight - 16, pageWidth, 16, 'F');
  // Coral left accent
  doc.setFillColor(...CORAL);
  doc.rect(0, pageHeight - 16, 5, 16, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...PEACH);
  doc.text(
    'Computer-generated receipt. Valid for 80G tax deduction under Income Tax Act, 1961.',
    pageWidth / 2, pageHeight - 9, { align: 'center' }
  );
  doc.setTextColor(...TEAL);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    pageWidth / 2, pageHeight - 4, { align: 'center' }
  );

  // Save
  doc.save(`Receipt-${donation.receiptNumber || donation.receipt_number || 'DRAFT'}.pdf`);
}
