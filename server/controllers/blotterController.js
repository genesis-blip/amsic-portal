const mongoose = require('mongoose');
const BlotterRecord = require('../models/BlotterRecord');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { searchFilter } = require('../utils/query');
const { BLOTTER_FLOW, assertTransition } = require('../services/statusRules');
const { nextNumber } = require('../services/counterService');
const { MS_PER_DAY, isValidIsoDay, dayStart, toIsoDay } = require('../services/dates');

const EDITABLE = ['complainant', 'complainantName', 'respondentName', 'nature', 'details', 'incidentDate'];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => body[k] !== undefined && body[k] !== '').map((k) => [k, body[k]]));
const CLOSED = ['settled', 'escalated', 'dismissed'];
const SETTLEMENT_DAYS = 15;

function decorate(doc) {
  const r = doc.toJSON ? doc.toJSON() : doc;
  const end = r.closedAt ? new Date(r.closedAt) : new Date();
  const daysOpen = Math.floor((end - new Date(r.createdAt)) / MS_PER_DAY);
  const isClosed = CLOSED.includes(r.status);
  const deadline = new Date(new Date(r.createdAt).getTime() + SETTLEMENT_DAYS * MS_PER_DAY);
  return {
    ...r,
    daysOpen,
    settlementDeadline: deadline,
    daysToDeadline: isClosed ? null : Math.ceil((deadline - new Date()) / MS_PER_DAY),
    isPastDeadline: !isClosed && new Date() > deadline,
    nextStatuses: BLOTTER_FLOW[r.status] || [],
  };
}

exports.listBlotters = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const filter = { ...searchFilter(search, ['caseNumber', 'complainantName', 'respondentName', 'nature']) };
  if (status) filter.status = { $in: String(status).split(',') };
  const docs = await BlotterRecord.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ items: docs.map(decorate), total: docs.length });
});

exports.getBlotter = asyncHandler(async (req, res) => {
  const doc = await BlotterRecord.findById(req.params.id).populate('complainant', 'firstName lastName residentNo');
  if (!doc) throw ApiError.notFound('Blotter record');
  res.json(decorate(doc));
});

exports.createBlotter = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  if (data.complainant && !mongoose.Types.ObjectId.isValid(data.complainant)) delete data.complainant;
  const doc = new BlotterRecord({ ...data, actions: [{ action: 'Complaint filed', note: data.nature || '' }] });
  await doc.validate();
  doc.caseNumber = await nextNumber('BLT', 4);
  await doc.save();
  res.status(201).json(decorate(doc));
});

exports.updateBlotter = asyncHandler(async (req, res) => {
  const doc = await BlotterRecord.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Blotter record');
  if (CLOSED.includes(doc.status)) throw ApiError.badRequest(`A ${doc.status} case can no longer be edited`);
  doc.set(pick(req.body));
  await doc.save();
  res.json(decorate(doc));
});

exports.updateBlotterStatus = asyncHandler(async (req, res) => {
  const { status, hearingDate, note = '' } = req.body;
  const doc = await BlotterRecord.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Blotter record');
  assertTransition(BLOTTER_FLOW, doc.status, status, 'Status');
  if (status === 'for_hearing') {
    if (!isValidIsoDay(hearingDate)) throw ApiError.badRequest('A hearing date is required', { hearingDate: 'Choose the hearing date' });
    if (hearingDate <= toIsoDay()) throw ApiError.badRequest('Hearing date must be in the future', { hearingDate: 'Pick a future date' });
    doc.hearingDate = dayStart(hearingDate);
  }
  doc.status = status;
  if (CLOSED.includes(status)) doc.closedAt = new Date();
  const label = { for_hearing: `Hearing set for ${hearingDate}`, mediation: 'Moved to mediation', settled: 'Case settled', escalated: 'Escalated to higher authority', dismissed: 'Case dismissed' }[status];
  doc.actions.push({ action: label, note });
  await doc.save();
  res.json(decorate(doc));
});

exports.addAction = asyncHandler(async (req, res) => {
  const doc = await BlotterRecord.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Blotter record');
  doc.actions.push({ action: req.body.action, note: req.body.note });
  await doc.save();
  res.status(201).json(decorate(doc));
});

exports.deleteBlotter = asyncHandler(async (req, res) => {
  const doc = await BlotterRecord.findByIdAndDelete(req.params.id);
  if (!doc) throw ApiError.notFound('Blotter record');
  res.json({ message: 'Blotter record deleted', id: req.params.id });
});
