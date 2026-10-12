const DocumentRequest = require('../models/DocumentRequest');
const Payment = require('../models/Payment');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { buildCertificate } = require('../services/certificate');

const publicUrl = () => (process.env.PUBLIC_URL || (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0]).replace(/\/$/, '');

async function captainName() {
  const captain = await User.findOne({ accountType: 'staff', role: 'captain', isActive: true }).sort({ createdAt: 1 });
  return process.env.BARANGAY_CAPTAIN || (captain ? `Hon. ${captain.firstName} ${captain.lastName}`.trim() : 'Punong Barangay');
}

const isPrintable = (doc) => ['ready', 'released'].includes(doc.status) && doc.paymentStatus !== 'unpaid';

function assertPrintable(doc) {
  if (!['ready', 'released'].includes(doc.status)) {
    throw ApiError.badRequest(`The document can be downloaded once it is ready for pickup (this request is ${doc.status}).`);
  }
  if (doc.paymentStatus === 'unpaid') {
    throw ApiError.badRequest(`Pay the fee of PHP ${doc.fees.total.toFixed(2)} first. The document can be downloaded after payment.`);
  }
}

async function sendPdf(doc, res, wantPreview) {
  const preview = !isPrintable(doc);
  if (preview && !wantPreview) assertPrintable(doc);
  if (preview && ['rejected', 'cancelled'].includes(doc.status)) {
    throw ApiError.badRequest(`There is no document to show because this request was ${doc.status}.`);
  }
  const payment = await Payment.findOne({ request: doc._id, isVoided: false }).sort({ paidAt: -1 });
  const pdf = await buildCertificate(doc, {
    payment,
    captainName: await captainName(),
    verifyUrl: `${publicUrl()}/verify/${encodeURIComponent(doc.referenceNumber)}`,
    preview,
  });
  const fileName = `${doc.documentType.name} - ${doc.referenceNumber}${preview ? ' (preview)' : ''}.pdf`.replace(/[^\w .()-]/g, '');
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${fileName}"`,
    'Content-Length': pdf.length,
    'Cache-Control': 'no-store',
  });
  res.send(pdf);
}

const load = (id) => DocumentRequest.findById(id).populate('resident').populate('documentType');

exports.staffCertificate = asyncHandler(async (req, res) => {
  const doc = await load(req.params.id);
  if (!doc) throw ApiError.notFound('Document request');
  await sendPdf(doc, res, req.query.preview === '1');
});

exports.myCertificate = asyncHandler(async (req, res) => {
  const doc = await load(req.params.id);
  if (!doc || String(doc.resident._id) !== String(req.user.resident)) throw ApiError.notFound('Document request');
  await sendPdf(doc, res, req.query.preview === '1');
});

exports.verify = asyncHandler(async (req, res) => {
  const doc = await DocumentRequest.findOne({ referenceNumber: String(req.params.referenceNumber).trim().toUpperCase() })
    .populate('resident', 'firstName lastName').populate('documentType', 'name');
  if (!doc) throw ApiError.notFound('Document');
  const issuedAt = doc.statusHistory.find((h) => h.status === 'ready')?.changedAt || null;
  const r = doc.resident;
  res.json({
    referenceNumber: doc.referenceNumber,
    document: doc.documentType?.name,
    issuedTo: r ? `${r.firstName} ${r.lastName ? `${r.lastName[0]}.` : ''}`.trim() : '',
    status: doc.status,
    valid: ['ready', 'released'].includes(doc.status) && doc.paymentStatus !== 'unpaid',
    issuedAt,
  });
});
