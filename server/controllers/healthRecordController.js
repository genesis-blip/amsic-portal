const mongoose = require('mongoose');
const HealthRecord = require('../models/HealthRecord');
const Resident = require('../models/Resident');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { dateRange } = require('../utils/query');
const { toIsoDay, dayStart, daysBetween } = require('../services/dates');

const EDITABLE = ['resident', 'recordType', 'visitDate', 'weightKg', 'heightCm', 'systolic', 'diastolic', 'vaccineName', 'doseNumber', 'nextDueDate', 'notes'];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => body[k] !== undefined).map((k) => [k, body[k] === '' ? null : body[k]]));
const POP = { path: 'resident', select: 'firstName lastName residentNo birthdate purok contactNumber' };

function decorate(doc) {
  const r = doc.toJSON ? doc.toJSON() : doc;
  const daysUntilDue = r.nextDueDate ? daysBetween(dayStart(toIsoDay()), r.nextDueDate) : null;
  return { ...r, daysUntilDue, isOverdue: daysUntilDue !== null && daysUntilDue < 0 };
}

exports.listRecords = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.resident && mongoose.Types.ObjectId.isValid(req.query.resident)) filter.resident = req.query.resident;
  if (req.query.recordType) filter.recordType = req.query.recordType;
  const range = dateRange(req.query.from, req.query.to);
  if (range) filter.visitDate = range;
  const docs = await HealthRecord.find(filter).sort({ visitDate: -1 }).limit(300).populate(POP);
  res.json({ items: docs.map(decorate), total: docs.length });
});

exports.listDue = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const today = dayStart(toIsoDay());
  const until = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  const all = await HealthRecord.find().sort({ visitDate: -1 }).populate(POP);
  const seen = new Set();
  const latest = all.filter((d) => {
    const key = `${d.resident && d.resident._id}|${d.recordType}|${d.vaccineName || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const items = latest
    .filter((d) => d.nextDueDate && d.nextDueDate <= until)
    .sort((a, b) => a.nextDueDate - b.nextDueDate)
    .map(decorate);
  res.json({
    days,
    overdue: items.filter((i) => i.isOverdue),
    upcoming: items.filter((i) => !i.isOverdue),
    total: items.length,
  });
});

exports.getRecord = asyncHandler(async (req, res) => {
  const doc = await HealthRecord.findById(req.params.id).populate(POP);
  if (!doc) throw ApiError.notFound('Health record');
  res.json(decorate(doc));
});

exports.createRecord = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  if (!data.resident || !mongoose.Types.ObjectId.isValid(data.resident) || !(await Resident.exists({ _id: data.resident }))) {
    throw ApiError.badRequest('Validation failed', { resident: 'Choose a valid resident' });
  }
  const doc = await HealthRecord.create(data);
  await doc.populate(POP);
  res.status(201).json(decorate(doc));
});

exports.updateRecord = asyncHandler(async (req, res) => {
  const doc = await HealthRecord.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Health record');
  const data = pick(req.body);
  delete data.resident;
  doc.set(data);
  await doc.save();
  await doc.populate(POP);
  res.json(decorate(doc));
});

exports.deleteRecord = asyncHandler(async (req, res) => {
  const doc = await HealthRecord.findByIdAndDelete(req.params.id);
  if (!doc) throw ApiError.notFound('Health record');
  res.json({ message: 'Health record deleted', id: req.params.id });
});
