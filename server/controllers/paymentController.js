const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const DocumentRequest = require('../models/DocumentRequest');
const Resident = require('../models/Resident');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { searchFilter, parsePaging, dateRange, paginate } = require('../utils/query');
const { nextNumber } = require('../services/counterService');
const { toIsoDay } = require('../services/dates');

const round2 = (n) => Math.round(n * 100) / 100;
const POPULATE = [
  { path: 'request', select: 'referenceNumber status fees' },
  { path: 'resident', select: 'firstName lastName residentNo' },
];

exports.listPayments = asyncHandler(async (req, res) => {
  const { search, method, category, voided, from, to } = req.query;
  const filter = { ...searchFilter(search, ['orNumber', 'payerName', 'description']) };
  if (method) filter.method = method;
  if (category) filter.category = category;
  if (voided === 'true' || voided === 'false') filter.isVoided = voided === 'true';
  const range = dateRange(from, to);
  if (range) filter.paidAt = range;
  const result = await paginate(Payment, filter, { ...parsePaging(req.query), sort: { paidAt: -1 } }, POPULATE);
  res.json(result);
});

exports.getSummary = asyncHandler(async (req, res) => {
  const range = dateRange(req.query.from, req.query.to);
  const filter = range ? { paidAt: range } : {};
  const payments = await Payment.find(filter).sort({ paidAt: 1 });
  const valid = payments.filter((p) => !p.isVoided);
  const voided = payments.filter((p) => p.isVoided);

  const total = round2(valid.reduce((s, p) => s + p.amount, 0));
  const byMethod = {};
  const byCategory = {};
  const byDay = {};
  valid.forEach((p) => {
    byMethod[p.method] = round2((byMethod[p.method] || 0) + p.amount);
    byCategory[p.category] = round2((byCategory[p.category] || 0) + p.amount);
    const day = toIsoDay(p.paidAt);
    byDay[day] = byDay[day] || { date: day, total: 0, count: 0 };
    byDay[day].total = round2(byDay[day].total + p.amount);
    byDay[day].count += 1;
  });
  const days = Object.values(byDay);
  const best = days.reduce((a, b) => (!a || b.total > a.total ? b : a), null);

  res.json({
    from: req.query.from || null,
    to: req.query.to || null,
    totalCollected: total,
    transactionCount: valid.length,
    averagePayment: valid.length ? round2(total / valid.length) : 0,
    highestPayment: valid.length ? Math.max(...valid.map((p) => p.amount)) : 0,
    lowestPayment: valid.length ? Math.min(...valid.map((p) => p.amount)) : 0,
    voidedCount: voided.length,
    voidedAmount: round2(voided.reduce((s, p) => s + p.amount, 0)),
    byMethod,
    byCategory,
    byDay: days,
    bestDay: best,
  });
});

exports.getPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate(POPULATE);
  if (!payment) throw ApiError.notFound('Payment');
  res.json(payment);
});

exports.createPayment = asyncHandler(async (req, res) => {
  const { request: requestId, payerName, amount, method, category, description } = req.body;
  const data = { payerName, amount, method, category, description };

  let request = null;
  if (requestId) {
    if (!mongoose.Types.ObjectId.isValid(requestId)) throw ApiError.badRequest('Invalid request ID', { request: 'Choose a valid request' });
    request = await DocumentRequest.findById(requestId).populate('resident');
    if (!request) throw ApiError.notFound('Document request');
    if (request.paymentStatus !== 'unpaid') throw ApiError.badRequest(`This request is already ${request.paymentStatus}`);
    if (['cancelled', 'rejected'].includes(request.status)) throw ApiError.badRequest(`Cannot pay for a ${request.status} request`);
    if (round2(Number(amount)) !== round2(request.fees.total)) {
      throw ApiError.badRequest(`Amount must be exactly ₱${request.fees.total.toFixed(2)} for ${request.referenceNumber}`, { amount: `Expected ${request.fees.total.toFixed(2)}` });
    }
    data.request = request._id;
    data.resident = request.resident._id;
    data.category = 'document_fee';
    if (!payerName) data.payerName = request.resident.fullName;
    if (!description) data.description = `Payment for ${request.referenceNumber}`;
  } else if (req.body.resident && mongoose.Types.ObjectId.isValid(req.body.resident)) {
    const resident = await Resident.findById(req.body.resident);
    if (resident) { data.resident = resident._id; if (!payerName) data.payerName = resident.fullName; }
  }

  const payment = new Payment(data);
  await payment.validate();
  payment.orNumber = await nextNumber('OR');
  await payment.save();
  if (request) {
    request.paymentStatus = 'paid';
    request.statusHistory.push({ status: request.status, note: `Paid ₱${payment.amount.toFixed(2)} (${payment.orNumber})` });
    await request.save();
  }
  await payment.populate(POPULATE);
  res.status(201).json(payment);
});

exports.voidPayment = asyncHandler(async (req, res) => {
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 3) throw ApiError.badRequest('A reason is required to void a payment', { reason: 'Give a reason (at least 3 characters)' });
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payment');
  if (payment.isVoided) throw ApiError.badRequest('Payment is already voided');
  if (payment.request) {
    const request = await DocumentRequest.findById(payment.request);
    if (request && request.status === 'released') throw ApiError.badRequest('Cannot void: the document was already released');
    if (request) {
      request.paymentStatus = 'unpaid';
      request.onlinePayment = undefined;
      request.statusHistory.push({ status: request.status, note: `Payment ${payment.orNumber} voided: ${reason}` });
      await request.save();
    }
  }
  payment.isVoided = true;
  payment.voidReason = reason;
  payment.voidedAt = new Date();
  await payment.save();
  await payment.populate(POPULATE);
  res.json(payment);
});
