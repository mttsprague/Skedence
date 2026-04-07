'use client';

import { jsPDF } from 'jspdf';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

export interface WaiverSignature {
  fullName: string;
  email: string;
  phoneNumber: string;
  signedAt: Date;
  isMinor: boolean;
}

const ORG_NAME = 'PolyFace Volleyball Academy';
const ORG_ACRONYM = 'PVA';

/** Mirrors iOS WaiverPDFGenerator exactly — same layout, text, signature block */
export function generateWaiverPDF(
  signature: WaiverSignature,
  athleteName: string,
  waiverText?: string
): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const pageWidth = 612;   // 8.5in × 72
  const pageHeight = 792;  // 11in × 72
  const left = 60;
  const right = 60;
  const contentWidth = pageWidth - left - right;
  const bottomMargin = 100;
  const maxY = pageHeight - bottomMargin;
  let y = 60;

  function checkPageBreak(needed: number) {
    if (y + needed > maxY) {
      doc.addPage();
      y = 60;
    }
  }

  function drawHRule(lineY: number, thickness = 0.5) {
    doc.setDrawColor(180);
    doc.setLineWidth(thickness);
    doc.line(left, lineY, pageWidth - right, lineY);
  }

  function wrappedText(
    text: string,
    startY: number,
    fontSize: number,
    bold = false,
    color = '#000000'
  ): number {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    const lineHeight = fontSize * 1.35;
    let cy = startY;
    for (const line of lines) {
      checkPageBreak(lineHeight);
      doc.text(line, left, cy);
      cy += lineHeight;
    }
    return cy;
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const titleText = ORG_NAME.toUpperCase();
  const titleW = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleW) / 2, y);
  y += 28;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const sub1 = 'Release of Liability, Assumption of Risk,';
  const sub2 = 'and Indemnification Agreement';
  doc.text(sub1, (pageWidth - doc.getTextWidth(sub1)) / 2, y);
  y += 20;
  doc.text(sub2, (pageWidth - doc.getTextWidth(sub2)) / 2, y);
  y += 20;

  drawHRule(y);
  y += 20;

  // ── Body ────────────────────────────────────────────────────────────────────
  if (waiverText && waiverText.trim()) {
    // Custom org waiver text — split by double newline, same as iOS
    const paragraphs = waiverText.split(/\n\n+/).filter(p => p.trim());
    for (const para of paragraphs) {
      const trimmed = para.trim();
      const lineHeight = 9 * 1.35;
      const lines = doc.setFontSize(9).splitTextToSize(trimmed, contentWidth) as string[];
      checkPageBreak(lines.length * lineHeight + 15);
      y = wrappedText(trimmed, y, 9);
      y += 12;
    }
    y += 10;
  } else {
    // Default waiver text — matches iOS default sections exactly
    const sections: Array<{ title?: string; body: string }> = [
      {
        body: `I acknowledge that I am voluntarily participating in volleyball lessons, training sessions, camps, or related activities offered by ${ORG_NAME} ("${ORG_ACRONYM}").\n\nI understand that participation in volleyball activities involves inherent risks, including but not limited to physical contact with other participants, falls, collisions, impact with volleyballs or equipment, overuse injuries, property damage, and serious injury or death. I knowingly and voluntarily assume all such risks, whether known or unknown, associated with my participation.\n\nI hereby release, waive, and discharge ${ORG_NAME}, and its owners, coaches, instructors, employees, agents, and representatives from any and all claims, demands, actions, or causes of action arising out of or related to my participation in ${ORG_ACRONYM} activities, including claims arising from the ordinary negligence of ${ORG_NAME} or its coaches, instructors, employees, agents, or representatives.`,
      },
      {
        body: `This release does not apply to acts of gross negligence, recklessness, or intentional misconduct.\n\nI acknowledge that ${ORG_NAME} has taken reasonable steps to provide a safe training environment; however, I understand that accidents and injuries may still occur. I agree to follow all rules, safety instructions, and guidelines provided by ${ORG_ACRONYM} and its staff, and I acknowledge that failure to do so may increase the risk of injury to myself or others.\n\nI further agree to indemnify and hold harmless ${ORG_NAME}, and its owners, coaches, instructors, employees, agents, and representatives from any and all claims, demands, damages, losses, or expenses (including reasonable attorneys' fees) brought by any third party arising out of or related to my participation in ${ORG_ACRONYM} activities.`,
      },
      {
        title: 'MINOR PARTICIPANTS (If Applicable)',
        body: `If the participant is under eighteen (18) years of age, I represent and warrant that I am the parent or legal guardian of the minor participant. I consent to the minor's participation in ${ORG_NAME} activities and execute this agreement on behalf of both myself and the minor, releasing and waiving claims as described above to the fullest extent permitted by Tennessee law.`,
      },
      {
        title: 'IMAGE / VIDEO / LIKENESS RELEASE',
        body: `I grant ${ORG_NAME} permission to photograph, record, or otherwise capture my image, voice, or likeness (or that of the minor participant) during ${ORG_ACRONYM} activities and to use such media for lawful promotional, marketing, educational, and social media purposes, without compensation. I understand that such media may be edited and used in various formats and platforms for an indefinite period.`,
      },
      {
        title: 'ACKNOWLEDGMENT AND ELECTRONIC ACCEPTANCE',
        body: `By clicking "I Agree", I acknowledge that I have read and understand this Release of Liability, Assumption of Risk, and Media Release Agreement, and that I am voluntarily giving up certain legal rights, including the right to sue for claims arising from the ordinary negligence of ${ORG_NAME}.\n\nThis agreement shall be governed by and construed in accordance with the laws of the State of Tennessee.`,
      },
    ];

    for (const section of sections) {
      if (section.title) {
        checkPageBreak(40);
        y = wrappedText(section.title, y, 11, true);
        y += 4;
      }
      y = wrappedText(section.body, y, 9);
      y += 14;
    }
  }

  // ── Separator ───────────────────────────────────────────────────────────────
  checkPageBreak(360);
  drawHRule(y);
  y += 25;

  // ── Signature block — mirrors iOS exactly ───────────────────────────────────
  const sigHeader = signature.isMinor
    ? 'PARENT/GUARDIAN ACKNOWLEDGMENT'
    : 'PARTICIPANT ACKNOWLEDGMENT';
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text(sigHeader, left, y);
  y += 30;

  function fieldRow(label: string, value: string) {
    checkPageBreak(28);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#555555');
    doc.text(label, left, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000000');
    doc.text(value, left + 100, y);
    y += 25;
  }

  fieldRow('Name:', signature.fullName);
  if (athleteName) fieldRow('Athlete:', athleteName);
  fieldRow('Email:', signature.email);
  fieldRow('Phone:', signature.phoneNumber || '—');

  const dateStr = signature.signedAt.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  fieldRow('Date Signed:', dateStr);

  // Digital signature line
  checkPageBreak(55);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#555555');
  doc.text('Digital Signature:', left, y);
  y += 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor('#0000CC');
  doc.text(signature.fullName, left + 20, y);
  y += 40;

  // ── Summary footer — mirrors iOS ─────────────────────────────────────────────
  checkPageBreak(120);
  doc.setDrawColor(80);
  doc.setLineWidth(1.5);
  doc.line(left, y, pageWidth - right, y);
  y += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text('WAIVER SUMMARY', left, y);
  y += 20;

  function summaryRow(label: string, value: string) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#000000');
    doc.text(label, left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, left + 110, y);
    y += 18;
  }

  if (athleteName) summaryRow('Athlete Name:', athleteName);
  summaryRow(signature.isMinor ? 'Parent/Guardian:' : 'Participant:', signature.fullName);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text('Signature:', left, y);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor('#0000CC');
  doc.text(signature.fullName, left + 110, y);
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  const shortDate = signature.signedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  summaryRow('Date Agreed:', shortDate);

  // Footer note at page bottom
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#888888');
  const footerNote = `This document was digitally signed through the ${ORG_NAME} web portal.`;
  const footerLines = doc.splitTextToSize(footerNote, contentWidth) as string[];
  doc.text(footerLines, left, pageHeight - 45);

  return doc.output('blob');
}

/** Upload waiver PDF blob to Firebase Storage and return the download URL.
 * Storage path mirrors iOS DocumentsRepository: users/{userId}/documents/{filename}
 */
export async function uploadWaiverPDF(
  userDocId: string,
  filename: string,
  pdfBlob: Blob
): Promise<string> {
  const storage = getStorage(app);
  // Matches iOS DocumentsRepository: "users/{userId}/documents/{filename}"
  const path = `users/${userDocId}/documents/${filename}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
  return getDownloadURL(storageRef);
}
