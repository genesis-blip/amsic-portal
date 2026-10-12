const Resident = require('../models/Resident');
const DocumentRequest = require('../models/DocumentRequest');
const Payment = require('../models/Payment');
const Incident = require('../models/Incident');
const SosAlert = require('../models/SosAlert');
const HealthRecord = require('../models/HealthRecord');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const requests = require('./documentRequestController');
const incidents = require('./incidentController');
const sos = require('./sosAlertController');
const { sessionFor } = require('./authController');
const paymongo = require('../services/paymongo');
const { nextNumber } = require('../services/counterService');

const SELF_EDITABLE = ['contactNumber', 'email', 'address', 'purok', 'civilStatus', 'occupation'];

exports.getProfile = asyncHandler(async (req, res) => {
  res.json(await sessionFor(req.user));
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const resident = await Resident.findById(req.user.resident);
  if (!resident) throw ApiError.notFound('Resident record');
  SELF_EDITABLE.forEach((k) => { if (req.body[k] !== undefined) resident[k] = req.body[k]; });
  if (resident.contactNumber === '') resident.contactNumber = undefined;
  await resident.save();
  if (req.body.email !== undefined) {
    req.user.email = resident.email;
    await req.user.save();
  }
  res.json(await sessionFor(req.user));
});

exports.listRequests = (req, res, next) => {
  req.query = { ...req.query, resident: String(req.user.resident) };
  return requests.listRequests(req, res, next);
};

exports.quote = (req, res, next) => {
  req.body = { ...req.body, resident: String(req.user.resident) };
  return requests.quote(req, res, next);
};

exports.createRequest = (req, res, next) => {
  req.body = { ...req.body, resident: String(req.user.resident), remarks: '' };
  return requests.createRequest(req, res, next);
};

async function ownRequest(req) {
  const doc = await DocumentRequest.findById(req.params.id).select('resident status');
  if (!doc || String(doc.resident) !== String(req.user.resident)) throw ApiError.notFound('Document request');
  return doc;
}

exports.getRequest = asyncHandler(async (req, res, next) => {
  await ownRequest(req);
  return requests.getRequest(req, res, next);
});

exports.cancelRequest = asyncHandler(async (req, res, next) => {
  const doc = await ownRequest(req);
  if (doc.status !== 'pending') throw ApiError.badRequest(`Only pending requests can be cancelled (this one is ${doc.status})`);
  req.body = { status: 'cancelled', note: 'Cancelled by the resident' };
  return requests.updateStatus(req, res, next);
});

exports.listIncidents = asyncHandler(async (req, res) => {
  const items = await Incident.find({ reporter: req.user.resident }).sort({ createdAt: -1 }).limit(100);
  res.json({ items, total: items.length });
});

exports.createIncident = asyncHandler(async (req, res, next) => {
  const r = await Resident.findById(req.user.resident);
  req.body = { ...req.body, reporter: String(r._id), reporterName: `${r.firstName} ${r.lastName}`, status: undefined, resolutionNotes: undefined };
  return incidents.createIncident(req, res, next);
});

exports.listSos = asyncHandler(async (req, res) => {
  const items = await SosAlert.find({ resident: req.user.resident }).sort({ createdAt: -1 }).limit(50);
  res.json({ items, total: items.length });
});

exports.createSos = (req, res, next) => {
  req.body = { ...req.body, resident: String(req.user.resident) };
  return sos.createAlert(req, res, next);
};

exports.listPayments = asyncHandler(async (req, res) => {
  const items = await Payment.find({ resident: req.user.resident, isVoided: false }).sort({ paidAt: -1 })
    .populate('request', 'referenceNumber');
  res.json({ items, total: items.length });
});

exports.listHealthRecords = asyncHandler(async (req, res) => {
  const items = await HealthRecord.find({ resident: req.user.resident }).sort({ visitDate: -1 });
  res.json({ items, total: items.length });
});

async function payableRequest(req) {
  const doc = await DocumentRequest.findById(req.params.id).select('+onlinePayment')
    .populate('resident', 'firstName lastName email contactNumber').populate('documentType', 'name');
  if (!doc || String(doc.resident._id) !== String(req.user.resident)) throw ApiError.notFound('Document request');
  return doc;
}

async function markPaid(doc, paymentId) {
  const result = await DocumentRequest.updateOne(
    { _id: doc._id, paymentStatus: 'unpaid' },
    {
      $set: { paymentStatus: 'paid', 'onlinePayment.status': 'succeeded', 'onlinePayment.paymentId': paymentId || '' },
      $push: { statusHistory: { status: doc.status, note: 'Paid online through PayMongo QR Ph', changedAt: new Date() } },
    },
  );
  if (result.modifiedCount === 0) return false;
  await Payment.create({
    orNumber: await nextNumber('OR'),
    request: doc._id,
    resident: doc.resident._id,
    payerName: `${doc.resident.firstName} ${doc.resident.lastName}`,
    amount: doc.fees.total,
    method: 'qrph',
    category: 'document_fee',
    description: `${doc.documentType.name} (${doc.referenceNumber}), PayMongo ${paymentId || doc.onlinePayment?.paymentIntentId || ''}`.trim(),
    paidAt: new Date(),
  });
  return true;
}

function assertPayable(doc) {
  if (doc.paymentStatus === 'waived') throw ApiError.badRequest('This document is free. There is nothing to pay.');
  if (['cancelled', 'rejected', 'released'].includes(doc.status)) throw ApiError.badRequest(`A ${doc.status} request can no longer be paid online.`);
}

exports.paymentOptions = (req, res) => res.json({ online: paymongo.isEnabled(), testMode: paymongo.isTestKey() });

exports.startPayment = asyncHandler(async (req, res) => {
  const doc = await payableRequest(req);
  if (doc.paymentStatus === 'paid') return res.json({ paid: true });
  assertPayable(doc);
  const op = doc.onlinePayment;
  if (op?.qrImage && op.status === 'awaiting_payment' && op.expiresAt - Date.now() > 60 * 1000) {
    return res.json({ paid: false, qrImage: op.qrImage, expiresAt: op.expiresAt, amount: doc.fees.total, testMode: paymongo.isTestKey() });
  }
  const r = doc.resident;
  const qr = await paymongo.createQrPh({
    amountPesos: doc.fees.total,
    description: `${doc.documentType.name} x${doc.copies} - ${doc.referenceNumber}`,
    billing: { name: `${r.firstName} ${r.lastName}`, email: r.email, phone: r.contactNumber },
    metadata: { request_id: String(doc._id), reference_number: doc.referenceNumber },
  });
  doc.onlinePayment = { paymentIntentId: qr.paymentIntentId, qrImage: qr.qrImage, expiresAt: qr.expiresAt, status: 'awaiting_payment' };
  await doc.save();
  res.json({ paid: false, qrImage: qr.qrImage, expiresAt: qr.expiresAt, amount: doc.fees.total, testMode: paymongo.isTestKey() });
});

exports.paymentStatus = asyncHandler(async (req, res) => {
  const doc = await payableRequest(req);
  if (doc.paymentStatus === 'paid') return res.json({ paid: true });
  const op = doc.onlinePayment;
  if (!op?.paymentIntentId) return res.json({ paid: false, expired: true });
  const intent = await paymongo.getIntent(op.paymentIntentId);
  if (intent.status === 'succeeded') {
    await markPaid(doc, intent.paymentId);
    return res.json({ paid: true });
  }
  res.json({ paid: false, expired: op.expiresAt < new Date() });
});

exports.simulatePayment = asyncHandler(async (req, res) => {
  if (!paymongo.isTestKey()) throw new ApiError(403, 'Only available with a PayMongo test key');
  const doc = await payableRequest(req);
  if (doc.paymentStatus === 'paid') return res.json({ paid: true });
  assertPayable(doc);
  if (!doc.onlinePayment?.paymentIntentId) throw ApiError.badRequest('Show the QR code first');
  await markPaid(doc, `test_${doc.onlinePayment.paymentIntentId}`);
  res.json({ paid: true });
});
