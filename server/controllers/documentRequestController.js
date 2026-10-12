const mongoose = require('mongoose');
const DocumentRequest = require('../models/DocumentRequest');
const DocumentType = require('../models/DocumentType');
const Resident = require('../models/Resident');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { escapeRegex, parseSort, parsePaging, dateRange } = require('../utils/query');
const { computeFees } = require('../services/feeService');
const { assertSlotBookable } = require('../services/scheduleService');
const { REQUEST_FLOW, assertTransition } = require('../services/statusRules');
const { nextNumber } = require('../services/counterService');
const { toIsoDay, dayStart, isValidIsoDay, daysBetween } = require('../services/dates');
const sms = require('../services/sms');

const POPULATE = [
  { path: 'resident', select: 'firstName middleName lastName suffix residentNo birthdate contactNumber purok' },
  { path: 'documentType', select: 'name code fee processingDays' },
];

function decorate(doc) {
  const r = doc.toJSON ? doc.toJSON() : doc;
  const today = toIsoDay();
  const pickupIso = toIsoDay(r.pickupDate);
  const daysUntilPickup = daysBetween(dayStart(today), dayStart(pickupIso));
  const isActive = ['pending', 'processing', 'ready'].includes(r.status);
  return {
    ...r,
    pickupDateIso: pickupIso,
    daysUntilPickup,
    isBehindSchedule: ['pending', 'processing'].includes(r.status) && daysUntilPickup < 0,
    isUnclaimed: r.status === 'ready' && daysUntilPickup < -7,
    nextStatuses: REQUEST_FLOW[r.status] || [],
    isActive,
  };
}

function requireIsoDay(value, field) {
  if (!isValidIsoDay(value)) throw ApiError.badRequest(`${field} must be a date in YYYY-MM-DD format`, { [field]: 'Choose a valid date' });
  return value;
}

async function loadResidentAndType(residentId, documentTypeId) {
  const errors = {};
  if (!mongoose.Types.ObjectId.isValid(residentId)) errors.resident = 'Choose a resident';
  if (!mongoose.Types.ObjectId.isValid(documentTypeId)) errors.documentType = 'Choose a document type';
  if (Object.keys(errors).length) throw ApiError.badRequest('Validation failed', errors);
  const [resident, type] = await Promise.all([Resident.findById(residentId), DocumentType.findById(documentTypeId)]);
  if (!resident) throw ApiError.notFound('Resident');
  if (!type) throw ApiError.notFound('Document type');
  if (!type.isActive) throw ApiError.badRequest(`${type.name} is not available right now`, { documentType: 'This document is inactive' });
  return { resident, type };
}

exports.listRequests = asyncHandler(async (req, res) => {
  const { search, status, documentType, paymentStatus, from, to, pickupFrom, pickupTo, resident, sort } = req.query;
  const filter = {};
  if (status) filter.status = { $in: String(status).split(',') };
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (documentType && mongoose.Types.ObjectId.isValid(documentType)) filter.documentType = documentType;
  if (resident && mongoose.Types.ObjectId.isValid(resident)) filter.resident = resident;
  const created = dateRange(from, to);
  if (created) filter.createdAt = created;
  const pickup = dateRange(pickupFrom, pickupTo);
  if (pickup) filter.pickupDate = pickup;
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), 'i');
    const residentIds = await Resident.find({ $or: [{ firstName: rx }, { lastName: rx }, { residentNo: rx }] }).distinct('_id');
    filter.$or = [{ referenceNumber: rx }, { purpose: rx }, { resident: { $in: residentIds } }];
  }
  const { limit, page, skip } = parsePaging(req.query);
  const sortBy = parseSort(sort, ['createdAt', 'pickupDate', 'referenceNumber', 'status']);
  const [items, total] = await Promise.all([
    DocumentRequest.find(filter).sort(sortBy).skip(skip).limit(limit).populate(POPULATE),
    DocumentRequest.countDocuments(filter),
  ]);
  res.json({ items: items.map(decorate), total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) });
});

exports.quote = asyncHandler(async (req, res) => {
  const { resident: residentId, documentType, copies = 1 } = req.body;
  const { resident, type } = await loadResidentAndType(residentId, documentType);
  const fees = computeFees(type, copies, resident.birthdate);
  res.json({ documentType: type.name, resident: resident.fullName, ...fees, processingDays: type.processingDays });
});

exports.listOverdue = asyncHandler(async (req, res) => {
  const today = dayStart(toIsoDay());
  const items = await DocumentRequest.find({ status: { $in: ['pending', 'processing', 'ready'] }, pickupDate: { $lt: today } })
    .sort({ pickupDate: 1 })
    .populate(POPULATE);
  const decorated = items.map((d) => {
    const r = decorate(d);
    return { ...r, daysOverdue: -r.daysUntilPickup };
  });
  res.json({
    behindSchedule: decorated.filter((r) => r.isBehindSchedule),
    unclaimed: decorated.filter((r) => r.status === 'ready'),
    total: decorated.length,
  });
});

exports.getRequest = asyncHandler(async (req, res) => {
  const doc = await DocumentRequest.findById(req.params.id).populate(POPULATE);
  if (!doc) throw ApiError.notFound('Document request');
  const payments = await Payment.find({ request: doc._id }).sort({ paidAt: -1 });
  res.json({ ...decorate(doc), payments });
});

exports.createRequest = asyncHandler(async (req, res) => {
  const { resident: residentId, documentType, purpose, copies = 1, pickupDate, pickupSlot, remarks } = req.body;
  const { resident, type } = await loadResidentAndType(residentId, documentType);
  const isoDay = requireIsoDay(pickupDate, 'pickupDate');
  const fees = computeFees(type, copies, resident.birthdate);
  await assertSlotBookable(isoDay, pickupSlot);

  const doc = new DocumentRequest({
    resident: resident._id,
    documentType: type._id,
    purpose,
    copies: fees.copies,
    pickupDate: dayStart(isoDay),
    pickupSlot,
    remarks,
    fees: { unitFee: fees.unitFee, subtotal: fees.subtotal, discountRate: fees.discountRate, discount: fees.discount, total: fees.total },
    isSenior: fees.isSenior,
    paymentStatus: fees.total === 0 ? 'waived' : 'unpaid',
    statusHistory: [{ status: 'pending', note: 'Request submitted' }],
  });
  await doc.validate();
  doc.referenceNumber = await nextNumber('BRG');
  await doc.save();
  await doc.populate(POPULATE);
  res.status(201).json(decorate(doc));
});

exports.updateRequest = asyncHandler(async (req, res) => {
  const doc = await DocumentRequest.findById(req.params.id).populate('resident').populate('documentType');
  if (!doc) throw ApiError.notFound('Document request');
  if (doc.status !== 'pending') throw ApiError.badRequest(`Only pending requests can be edited (this one is ${doc.status})`);
  if (doc.paymentStatus === 'paid') throw ApiError.badRequest('Paid requests can no longer be edited');

  const { purpose, copies, pickupDate, pickupSlot, remarks } = req.body;
  if (purpose !== undefined) doc.purpose = purpose;
  if (remarks !== undefined) doc.remarks = remarks;
  if (copies !== undefined) {
    const fees = computeFees(doc.documentType, copies, doc.resident.birthdate);
    doc.copies = fees.copies;
    doc.fees = { unitFee: fees.unitFee, subtotal: fees.subtotal, discountRate: fees.discountRate, discount: fees.discount, total: fees.total };
    doc.paymentStatus = fees.total === 0 ? 'waived' : 'unpaid';
  }
  const newDay = pickupDate !== undefined ? requireIsoDay(pickupDate, 'pickupDate') : toIsoDay(doc.pickupDate);
  const newSlot = pickupSlot !== undefined ? pickupSlot : doc.pickupSlot;
  if (newDay !== toIsoDay(doc.pickupDate) || newSlot !== doc.pickupSlot) {
    await assertSlotBookable(newDay, newSlot, doc._id);
    doc.pickupDate = dayStart(newDay);
    doc.pickupSlot = newSlot;
  }
  await doc.save();
  await doc.populate(POPULATE);
  res.json(decorate(doc));
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;
  const doc = await DocumentRequest.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Document request');
  assertTransition(REQUEST_FLOW, doc.status, status, 'Status');
  if (status === 'released' && doc.paymentStatus === 'unpaid') {
    throw ApiError.badRequest(`Cannot release: ₱${doc.fees.total.toFixed(2)} is still unpaid. Record the payment first.`);
  }
  if (status === 'rejected' && !String(note).trim()) {
    throw ApiError.badRequest('A reason is required when rejecting', { note: 'Give a reason for rejecting' });
  }
  doc.status = status;
  if (status === 'released') doc.releasedAt = new Date();
  doc.statusHistory.push({ status, note });
  await doc.save();
  await doc.populate(POPULATE);
  if (process.env.SMS_STATUS_UPDATES === 'on') sms.sendRequestStatus(doc.resident?.contactNumber, doc.referenceNumber, doc.documentType?.name || 'document', status).catch(() => {});
  res.json(decorate(doc));
});

exports.deleteRequest = asyncHandler(async (req, res) => {
  const doc = await DocumentRequest.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Document request');
  if (doc.paymentStatus === 'paid') throw ApiError.badRequest('Paid requests cannot be deleted. Cancel it instead.');
  if (doc.status === 'released') throw ApiError.badRequest('Released requests cannot be deleted');
  await doc.deleteOne();
  res.json({ message: 'Document request deleted', id: req.params.id });
});
