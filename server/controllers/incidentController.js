const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { searchFilter, dateRange } = require('../utils/query');
const { INCIDENT_FLOW, assertTransition } = require('../services/statusRules');
const { MS_PER_DAY } = require('../services/dates');

const EDITABLE = ['reporter', 'reporterName', 'type', 'description', 'location', 'occurredAt', 'urgency'];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => body[k] !== undefined && body[k] !== '').map((k) => [k, body[k]]));
const URGENCY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };
const STALE_DAYS = { critical: 1, high: 2, medium: 5, low: 7 };

function decorate(doc) {
  const r = doc.toJSON ? doc.toJSON() : doc;
  const end = r.resolvedAt ? new Date(r.resolvedAt) : new Date();
  const daysOpen = Math.floor((end - new Date(r.createdAt)) / MS_PER_DAY);
  const isOpen = ['open', 'under_review'].includes(r.status);
  return {
    ...r,
    daysOpen,
    priorityScore: isOpen ? URGENCY_WEIGHT[r.urgency] * 10 + daysOpen : 0,
    isStale: isOpen && daysOpen > STALE_DAYS[r.urgency],
    nextStatuses: INCIDENT_FLOW[r.status] || [],
  };
}

exports.listIncidents = asyncHandler(async (req, res) => {
  const { search, status, type, urgency, from, to, sort = 'newest' } = req.query;
  const filter = { ...searchFilter(search, ['reporterName', 'description', 'location']) };
  if (status) filter.status = { $in: String(status).split(',') };
  if (type) filter.type = type;
  if (urgency) filter.urgency = urgency;
  const range = dateRange(from, to);
  if (range) filter.occurredAt = range;
  const docs = await Incident.find(filter).sort({ createdAt: sort === 'oldest' ? 1 : -1 }).limit(200);
  let items = docs.map(decorate);
  if (sort === 'priority') items = items.sort((a, b) => b.priorityScore - a.priorityScore);
  res.json({ items, total: items.length });
});

exports.getIncident = asyncHandler(async (req, res) => {
  const doc = await Incident.findById(req.params.id).populate('reporter', 'firstName lastName residentNo contactNumber');
  if (!doc) throw ApiError.notFound('Incident');
  res.json(decorate(doc));
});

exports.createIncident = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  if (data.reporter && !mongoose.Types.ObjectId.isValid(data.reporter)) delete data.reporter;
  const doc = await Incident.create(data);
  res.status(201).json(decorate(doc));
});

exports.updateIncident = asyncHandler(async (req, res) => {
  const doc = await Incident.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Incident');
  if (!['open', 'under_review'].includes(doc.status)) throw ApiError.badRequest(`A ${doc.status} incident can no longer be edited`);
  doc.set(pick(req.body));
  await doc.save();
  res.json(decorate(doc));
});

exports.updateIncidentStatus = asyncHandler(async (req, res) => {
  const { status, resolutionNotes } = req.body;
  const doc = await Incident.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Incident');
  assertTransition(INCIDENT_FLOW, doc.status, status, 'Status');
  if (['resolved', 'dismissed'].includes(status) && !String(resolutionNotes || '').trim()) {
    throw ApiError.badRequest('Resolution notes are required to close an incident', { resolutionNotes: 'Explain how it was closed' });
  }
  doc.status = status;
  if (resolutionNotes !== undefined) doc.resolutionNotes = resolutionNotes;
  if (['resolved', 'dismissed'].includes(status)) doc.resolvedAt = new Date();
  await doc.save();
  res.json(decorate(doc));
});

exports.deleteIncident = asyncHandler(async (req, res) => {
  const doc = await Incident.findByIdAndDelete(req.params.id);
  if (!doc) throw ApiError.notFound('Incident');
  res.json({ message: 'Incident deleted', id: req.params.id });
});
