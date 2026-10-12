const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { ageOn } = require('./dates');

const SEAL = path.join(__dirname, '..', 'assets', 'logo-round.png');
const RED = '#931B27';
const GOLD = '#AB7A22';
const PAPER = '#FCFBF8';
const INK = '#231B17';
const MUTED = '#75685F';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) || n % 10 > 3 ? 0 : n % 10]}`;
function ph(date) {
  const d = new Date(new Date(date).getTime() + 8 * 3600 * 1000);
  return { day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()], year: d.getUTCFullYear() };
}
const longDate = (date) => { const p = ph(date); return `${p.month} ${p.day}, ${p.year}`; };
const peso = (n) => `PHP ${Number(n || 0).toFixed(2)}`;

function fullName(r) {
  return [r.firstName, r.middleName ? `${r.middleName[0]}.` : '', r.lastName, r.suffix].filter(Boolean).join(' ').toUpperCase();
}

function fullAddress(r) {
  let a = String(r.address || '').trim().replace(/[.,\s]+$/, '');
  const has = (t) => a.toLowerCase().includes(t);
  if (r.purok && !has(r.purok.toLowerCase())) a += `, ${r.purok}`;
  if (!has('amsic')) a += ', Barangay Amsic';
  if (!has('angeles')) a += ', Angeles City';
  if (!has('pampanga')) a += ', Pampanga';
  return a.replace(/^,\s*/, '');
}

function kindOf(type) {
  const s = `${type.code} ${type.name}`.toLowerCase();
  const rules = [
    ['barangayid', /barangay ?id|brgy ?id/], ['indigency', /indigen/], ['residency', /residen/], ['goodmoral', /good ?moral/],
    ['soloparent', /solo ?parent/], ['cohabitation', /cohabit|live.?in/], ['guardianship', /guardian/], ['voter', /voter/],
    ['business', /business/], ['building', /building|construction/], ['cedula', /cedula|community tax/], ['clearance', /clearance/],
  ];
  return (rules.find(([, rx]) => rx.test(s)) || ['generic'])[0];
}

function wording(kind, ctx) {
  const { name, honorific, age, civil, address, years, purpose, docName, isVoter } = ctx;
  const who = `${honorific} ${name}, ${age} years old, ${civil}, Filipino`;
  const lives = `a bona fide resident of ${address}`;
  const since = years > 0 ? `, and has been residing in this barangay for ${years} year${years > 1 ? 's' : ''}` : '';
  const forPurpose = `This certification is issued upon the request of the above-named person for ${purpose.toUpperCase()} and for whatever legal purpose it may serve.`;
  switch (kind) {
    case 'residency':
      return { title: 'CERTIFICATE OF RESIDENCY', body: [`This is to certify that ${who}, is ${lives}${since}.`, forPurpose] };
    case 'clearance':
      return {
        title: 'BARANGAY CLEARANCE',
        body: [
          `This is to certify that ${who}, is ${lives}.`,
          'Based on the records of this office, the above-named person has no derogatory record and has not been charged with any offense in this barangay as of this date.',
          forPurpose,
        ],
        validMonths: 6,
      };
    case 'indigency':
      return {
        title: 'CERTIFICATE OF INDIGENCY',
        body: [
          `This is to certify that ${who}, is ${lives}.`,
          'This further certifies that the above-named person belongs to an indigent family in this barangay, with no sufficient and regular source of income.',
          forPurpose,
        ],
      };
    case 'goodmoral':
      return {
        title: 'CERTIFICATE OF GOOD MORAL CHARACTER',
        body: [
          `This is to certify that ${who}, is ${lives}${since}.`,
          'The above-named person is known to this office to be of good moral character, a law-abiding citizen, and has no derogatory record on file in this barangay.',
          forPurpose,
        ],
        validMonths: 6,
      };
    case 'soloparent':
      return {
        title: 'CERTIFICATION (SOLO PARENT)',
        body: [
          `This is to certify that ${who}, is ${lives}.`,
          'Based on the declaration of the applicant and the records of this office, the above-named person is a solo parent who is solely responsible for the care and support of their child or children, in accordance with Republic Act No. 11861 (Expanded Solo Parents Welfare Act).',
          forPurpose,
        ],
        validMonths: 12,
      };
    case 'cohabitation':
      return {
        title: 'CERTIFICATE OF COHABITATION',
        body: [
          `This is to certify that ${who}, is ${lives}.`,
          'Based on the declaration of the applicant and the verification of this office, the above-named person is living together with a partner as husband and wife without the benefit of marriage at the above address.',
          forPurpose,
        ],
      };
    case 'guardianship':
      return {
        title: 'CERTIFICATE OF GUARDIANSHIP',
        body: [
          `This is to certify that ${who}, is ${lives}.`,
          'Based on the declaration of the applicant and the records of this office, the above-named person is the guardian of the minor under their care and custody, living at the same address.',
          forPurpose,
        ],
      };
    case 'voter':
      return {
        title: 'CERTIFICATE OF VOTER REGISTRATION',
        body: [
          `This is to certify that ${who}, is ${lives}.`,
          isVoter
            ? 'Based on the records of this barangay, the above-named person is a registered voter of Barangay Amsic, Angeles City.'
            : 'The above-named person declared that they are a registered voter of Barangay Amsic. Final confirmation rests with the Commission on Elections (COMELEC).',
          forPurpose,
        ],
      };
    case 'business':
      return {
        title: 'BARANGAY BUSINESS CLEARANCE',
        body: [
          `This is to certify that ${who}, is ${lives}.`,
          `This office interposes no objection to the operation of the business applied for by the above-named person within the territorial jurisdiction of Barangay Amsic (${purpose}), subject to compliance with all existing laws and barangay ordinances.`,
          'This clearance may be revoked for violation of barangay ordinances or upon complaint found to be valid.',
        ],
        validMonths: 12,
      };
    case 'building':
      return {
        title: 'BARANGAY ENDORSEMENT FOR BUILDING PERMIT',
        body: [
          `This is to certify that ${who}, is ${lives}.`,
          'This office interposes no objection to the construction, renovation or repair applied for by the above-named person at the above address, subject to the approval of the Office of the Building Official and compliance with the National Building Code.',
          forPurpose,
        ],
      };
    case 'cedula':
      return {
        title: 'CERTIFICATION OF COMMUNITY TAX PAYMENT',
        body: [
          `This is to certify that ${who}, is ${lives}.`,
          'The above-named person has paid the community tax through this barangay for the current year, as shown by the official receipt indicated below.',
          forPurpose,
        ],
      };
    default:
      return { title: docName.toUpperCase(), body: [`This is to certify that ${who}, is ${lives}${since}.`, forPurpose] };
  }
}

async function qrPng(text) {
  return QRCode.toBuffer(text, { margin: 1, width: 220, color: { dark: INK, light: '#FFFFFF' } });
}

function guilloche(doc, x, y, w, h) {
  doc.save().rect(x, y, w, h).clip();
  doc.rect(x, y, w, h).fill(PAPER);
  const sets = [[RED, 0.05, 2.1], [INK, 0.035, -0.47]];
  for (const [color, opacity, slope] of sets) {
    doc.strokeColor(color).strokeOpacity(opacity).lineWidth(0.5);
    for (let i = -h * 3; i < w + h * 3; i += 7) {
      doc.moveTo(x + i, y).lineTo(x + i + h / slope, y + h).stroke();
    }
  }
  doc.restore();
  doc.strokeOpacity(1).fillOpacity(1);
}

function tricolor(doc, x, y, w, h) {
  doc.rect(x, y, w * 0.3, h).fill(RED);
  doc.rect(x + w * 0.3, y, w * 0.4, h).fill('#FFFFFF');
  doc.rect(x + w * 0.7, y, w * 0.3, h).fill(RED);
}

function paper(doc) {
  const { width: W, height: H } = doc.page;
  guilloche(doc, 0, 0, W, H);
  tricolor(doc, 0, 0, W, 6);
  tricolor(doc, 0, H - 6, W, 6);
  doc.rect(16, 18, W - 32, H - 36).lineWidth(0.8).strokeColor(RED).strokeOpacity(0.35).stroke();
  doc.rect(20, 22, W - 40, H - 44).lineWidth(0.4).stroke();
  doc.strokeOpacity(1);
}

function header(doc) {
  const top = 44;
  const W = doc.page.width;
  doc.image(SEAL, 60, top, { width: 72 });
  doc.fillColor(INK).font('Helvetica').fontSize(10)
    .text('Republic of the Philippines', 0, top + 4, { align: 'center' })
    .text('Province of Pampanga', { align: 'center' })
    .text('City of Angeles', { align: 'center' });
  doc.font('Helvetica-Bold').fontSize(16).fillColor(RED).text('BARANGAY AMSIC', { align: 'center', characterSpacing: 0.5 });
  doc.font('Helvetica').fontSize(9.5).fillColor(GOLD).text('OFFICE OF THE PUNONG BARANGAY', { align: 'center', characterSpacing: 1 });
  doc.moveTo(56, top + 90).lineTo(W - 56, top + 90).lineWidth(1.6).strokeColor(RED).stroke();
  doc.moveTo(56, top + 94).lineTo(W - 56, top + 94).lineWidth(0.5).strokeColor(GOLD).stroke();
}

function previewMark(doc) {
  const W = doc.page.width;
  const H = doc.page.height;
  const size = Math.min(W, H) / 9.5;
  doc.save();
  doc.rotate(-35, { origin: [W / 2, H / 2] });
  doc.fillColor(RED).opacity(0.16).font('Helvetica-Bold').fontSize(size)
    .text('PREVIEW ONLY', -W / 2, H / 2 - size, { width: W * 2, align: 'center', lineBreak: false });
  doc.fontSize(size / 2.2).text('NOT YET VALID', -W / 2, H / 2 + size * 0.2, { width: W * 2, align: 'center', lineBreak: false });
  doc.restore();
  doc.save().rect(0, 0, W, 22).fill(RED).restore();
  doc.fillColor('#FFFFFF').opacity(1).font('Helvetica-Bold').fontSize(9)
    .text('PREVIEW - This document becomes valid once it is ready for pickup and paid.', 0, 7, { width: W, align: 'center' });
}

async function buildCertificate(request, { payment, captainName, verifyUrl, preview = false }) {
  const r = request.resident;
  const type = request.documentType;
  const kind = kindOf(type);
  const readyAt = request.statusHistory?.find((h) => h.status === 'ready')?.changedAt || request.releasedAt || new Date();
  const issued = ph(readyAt);
  const ctx = {
    name: fullName(r),
    honorific: r.sex === 'female' ? 'Ms.' : 'Mr.',
    age: ageOn(r.birthdate, readyAt),
    civil: r.civilStatus || 'single',
    address: fullAddress(r),
    years: r.yearsOfResidency || 0,
    purpose: request.purpose,
    docName: type.name,
    isVoter: r.isVoter,
  };
  const qr = await qrPng(verifyUrl);
  const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 56, right: 56 }, info: { Title: `${type.name} - ${request.referenceNumber}`, Author: 'Barangay Amsic' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  if (kind === 'barangayid') {
    drawBarangayId(doc, request, ctx, qr, captainName);
  } else {
    const w = wording(kind, ctx);
    paper(doc);
    header(doc);
    doc.save().opacity(0.07).image(SEAL, (doc.page.width - 300) / 2, 290, { width: 300 }).restore();

    doc.fillColor(RED).font('Helvetica-Bold').fontSize(20).text(w.title, 56, 166, { align: 'center', characterSpacing: 1 });
    const tw = Math.min(doc.widthOfString(w.title, { characterSpacing: 1 }), doc.page.width - 140);
    doc.moveTo((doc.page.width - tw) / 2, doc.y + 4).lineTo((doc.page.width + tw) / 2, doc.y + 4).lineWidth(1).strokeColor(GOLD).stroke();
    doc.fillColor(INK);
    doc.moveDown(1.6);
    doc.font('Helvetica-Bold').fontSize(11.5).text('TO WHOM IT MAY CONCERN:');
    doc.moveDown(0.9);
    doc.font('Times-Roman').fontSize(13).fillColor(INK);
    for (const p of w.body) {
      doc.text(p, { align: 'justify', indent: 36, lineGap: 4 });
      doc.moveDown(0.8);
    }
    doc.text(`Issued this ${ordinal(issued.day)} day of ${issued.month} ${issued.year} at Barangay Amsic, Angeles City, Pampanga, Philippines.`, { align: 'justify', indent: 36, lineGap: 4 });

    const sigY = Math.max(doc.y + 60, 560);
    doc.font('Helvetica-Bold').fontSize(12).text(captainName.toUpperCase(), 300, sigY, { width: 240, align: 'center' });
    doc.moveTo(320, sigY - 4).lineTo(520, sigY - 4).lineWidth(0.7).strokeColor(INK).stroke();
    doc.font('Helvetica').fontSize(10.5).text('Punong Barangay', 300, doc.y + 2, { width: 240, align: 'center' });

    const boxY = 650;
    doc.image(qr, 56, boxY, { width: 92 });
    const lines = [
      ['Reference no.', request.referenceNumber],
      ['Date issued', longDate(readyAt)],
      ...(w.validMonths ? [['Valid until', longDate(new Date(new Date(readyAt).setMonth(new Date(readyAt).getMonth() + w.validMonths)))]] : []),
      ['Fee', request.paymentStatus === 'waived' ? 'Free of charge' : peso(request.fees.total)],
      ...(payment ? [['O.R. no.', `${payment.orNumber} (${longDate(payment.paidAt)})`]] : []),
    ];
    let y = boxY + 4;
    for (const [k, v] of lines) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(k, 160, y, { width: 80 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(v, 240, y, { width: 300 });
      y += 14;
    }
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text('Scan the QR code or open the link below to check that this document is genuine.', 160, y + 6, { width: 380 })
      .text(verifyUrl, 160, doc.y + 1, { width: 380, link: verifyUrl, underline: true });

    doc.font('Helvetica-Oblique').fontSize(8).fillColor(MUTED)
      .text('Not valid without the official dry seal of Barangay Amsic when presented in print. Any erasure or alteration makes this document void.', 56, 772, { width: doc.page.width - 112, align: 'center' });
  }
  if (preview) previewMark(doc);
  doc.end();
  return done;
}

function drawBarangayId(doc, request, ctx, qr, captainName) {
  const r = request.resident;
  const W = 243; const H = 153;
  const x = (doc.page.width - W) / 2;
  doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text('BARANGAY IDENTIFICATION CARD', 0, 50, { align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Print at 100% scale, cut along the border, and laminate. Attach a 1x1 photo in the box.', { align: 'center' });

  const card = (y) => {
    doc.save().roundedRect(x, y, W, H, 8).clip();
    guilloche(doc, x, y, W, H);
    doc.save().opacity(0.07).image(SEAL, x + W / 2 - 55, y + H / 2 - 55, { width: 110 }).restore();
    tricolor(doc, x, y, W, 3);
    tricolor(doc, x, y + H - 3, W, 3);
    doc.restore();
    doc.roundedRect(x, y, W, H, 8).lineWidth(0.8).strokeColor(RED).strokeOpacity(0.5).stroke().strokeOpacity(1);
  };
  const letterhead = (y) => {
    doc.image(SEAL, x + 8, y + 8, { width: 24 });
    doc.fillColor(RED).font('Helvetica-Bold').fontSize(8.5).text('BARANGAY AMSIC', x, y + 10, { width: W, align: 'center', characterSpacing: 0.4 });
    doc.fillColor(MUTED).font('Helvetica').fontSize(5.8).text('Angeles City, Pampanga  |  Resident Identification', x, y + 21, { width: W, align: 'center' });
    doc.moveTo(x + 8, y + 35).lineTo(x + W - 8, y + 35).lineWidth(0.5).strokeColor(GOLD).stroke();
  };

  let y = 100;
  card(y);
  letterhead(y);
  doc.rect(x + 10, y + 42, 58, 62).lineWidth(0.5).strokeColor(MUTED).dash(2, { space: 2 }).stroke().undash();
  doc.fillColor(MUTED).fontSize(6).text('1x1 PHOTO', x + 10, y + 70, { width: 58, align: 'center' });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text(ctx.name, x + 76, y + 42, { width: W - 84 });
  doc.font('Helvetica').fontSize(6).fillColor(MUTED).text('RESIDENT NO.', x + 76, doc.y + 4);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(RED).text(r.residentNo || '', x + 76, doc.y + 1, { characterSpacing: 0.6 });
  doc.font('Helvetica').fontSize(6).fillColor(MUTED).text('BIRTHDATE', x + 76, doc.y + 3);
  doc.font('Helvetica').fontSize(8).fillColor(INK).text(longDate(r.birthdate), x + 76, doc.y + 1);
  doc.font('Helvetica').fontSize(6).fillColor(MUTED).text('ADDRESS', x + 10, y + 110);
  doc.font('Helvetica').fontSize(7.2).fillColor(INK).text(ctx.address, x + 10, doc.y + 1, { width: W - 20 });

  y = 280;
  card(y);
  letterhead(y);
  doc.image(qr, x + W - 66, y + 44, { width: 56 });
  doc.font('Helvetica').fontSize(6).fillColor(MUTED).text('SEX / CIVIL STATUS', x + 10, y + 44);
  doc.font('Helvetica').fontSize(8).fillColor(INK).text(`${r.sex === 'female' ? 'Female' : 'Male'} / ${ctx.civil[0].toUpperCase()}${ctx.civil.slice(1)}`, x + 10, doc.y + 1);
  doc.font('Helvetica').fontSize(6).fillColor(MUTED).text('CONTACT NO.', x + 10, doc.y + 3);
  doc.font('Helvetica').fontSize(8).fillColor(INK).text(r.contactNumber || 'None on file', x + 10, doc.y + 1);
  doc.font('Helvetica').fontSize(6).fillColor(MUTED).text('REFERENCE NO.', x + 10, doc.y + 3);
  doc.font('Helvetica').fontSize(8).fillColor(INK).text(request.referenceNumber, x + 10, doc.y + 1);
  doc.moveTo(x + 60, y + 124).lineTo(x + W - 60, y + 124).lineWidth(0.5).strokeColor(INK).stroke();
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(INK).text(captainName.toUpperCase(), x, y + 127, { width: W, align: 'center' });
  doc.font('Helvetica').fontSize(6).fillColor(MUTED).text('Punong Barangay', x, doc.y, { width: W, align: 'center' });
}

module.exports = { buildCertificate, kindOf };
