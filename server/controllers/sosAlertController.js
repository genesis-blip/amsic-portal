const SosAlert = require('../models/SosAlert');
const Resident = require('../models/Resident');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { SOS_FLOW, assertTransition } = require('../services/statusRules');

const minutesBetween = (a, b) => (a && b ? Math.round(((new Date(b) - new Date(a)) / 60000) * 10) / 10 : null);

function decorate(doc) {
  const r = doc.toJSON ? doc.toJSON() : doc;
  return {
    ...r,
    responseMinutes: minutesBetween(r.createdAt, r.acknowledgedAt),
    resolutionMinutes: minutesBetween(r.createdAt, r.resolvedAt),
    minutesWaiting: r.status === 'active' ? minutesBetween(r.createdAt, new Date()) : null,
    nextStatuses: SOS_FLOW[r.status] || [],
  };
}

exports.listAlerts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  const docs = await SosAlert.find(filter).sort({ createdAt: -1 }).limit(200)
    .populate('resident', 'firstName lastName residentNo contactNumber purok');
  res.json({ items: docs.map(decorate), total: docs.length });
});

exports.getMetrics = asyncHandler(async (req, res) => {
  const docs = await SosAlert.find();
  const responded = docs.map(decorate).filter((d) => d.responseMinutes !== null);
  const resolved = docs.map(decorate).filter((d) => d.resolutionMinutes !== null);
  const avg = (arr, key) => (arr.length ? Math.round((arr.reduce((s, x) => s + x[key], 0) / arr.length) * 10) / 10 : null);
  const byType = {};
  docs.forEach((d) => { byType[d.emergencyType] = (byType[d.emergencyType] || 0) + 1; });
  res.json({
    total: docs.length,
    active: docs.filter((d) => d.status === 'active').length,
    acknowledged: docs.filter((d) => d.status === 'acknowledged').length,
    resolved: docs.filter((d) => d.status === 'resolved').length,
    averageResponseMinutes: avg(responded, 'responseMinutes'),
    averageResolutionMinutes: avg(resolved, 'resolutionMinutes'),
    fastestResponseMinutes: responded.length ? Math.min(...responded.map((d) => d.responseMinutes)) : null,
    slowestResponseMinutes: responded.length ? Math.max(...responded.map((d) => d.responseMinutes)) : null,
    byType,
  });
});

exports.getAlert = asyncHandler(async (req, res) => {
  const doc = await SosAlert.findById(req.params.id).populate('resident', 'firstName lastName residentNo contactNumber purok address');
  if (!doc) throw ApiError.notFound('SOS alert');
  res.json(decorate(doc));
});

exports.createAlert = asyncHandler(async (req, res) => {
  const { resident, emergencyType, message, location, latitude, longitude } = req.body;
  const exists = resident && (await Resident.exists({ _id: resident }));
  if (!exists) throw ApiError.badRequest('Validation failed', { resident: 'Choose a valid resident' });
  const open = await SosAlert.findOne({ resident, status: { $in: ['active', 'acknowledged'] } });
  if (open) throw ApiError.badRequest('This resident already has an open SOS alert');
  const doc = await SosAlert.create({ resident, emergencyType, message, location, latitude, longitude });
  await doc.populate('resident', 'firstName lastName residentNo contactNumber purok');
  res.status(201).json(decorate(doc));
});

exports.updateAlertStatus = asyncHandler(async (req, res) => {
  const doc = await SosAlert.findById(req.params.id);
  if (!doc) throw ApiError.notFound('SOS alert');
  assertTransition(SOS_FLOW, doc.status, req.body.status, 'Status');
  doc.status = req.body.status;
  if (doc.status === 'acknowledged') doc.acknowledgedAt = new Date();
  if (doc.status === 'resolved') {
    doc.resolvedAt = new Date();
    if (!doc.acknowledgedAt) doc.acknowledgedAt = doc.resolvedAt;
  }
  await doc.save();
  await doc.populate('resident', 'firstName lastName residentNo contactNumber purok');
  res.json(decorate(doc));
});

exports.deleteAlert = asyncHandler(async (req, res) => {
  const doc = await SosAlert.findByIdAndDelete(req.params.id);
  if (!doc) throw ApiError.notFound('SOS alert');
  res.json({ message: 'SOS alert deleted', id: req.params.id });
});
