const Bulletin = require('../models/Bulletin');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { searchFilter } = require('../utils/query');

const EDITABLE = ['title', 'content', 'category', 'eventDate', 'expiresAt', 'isPinned'];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => body[k] !== undefined).map((k) => [k, body[k] === '' ? null : body[k]]));

exports.listBulletins = asyncHandler(async (req, res) => {
  const filter = { ...searchFilter(req.query.search, ['title', 'content']) };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.includeExpired !== 'true') {
    filter.$and = [{ $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gte: new Date() } }] }];
  }
  const items = await Bulletin.find(filter).sort({ isPinned: -1, createdAt: -1 });
  res.json(items);
});

exports.getBulletin = asyncHandler(async (req, res) => {
  const doc = await Bulletin.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Bulletin');
  res.json(doc);
});

function checkDates(data) {
  if (data.expiresAt && data.eventDate && new Date(data.expiresAt) < new Date(data.eventDate)) {
    throw ApiError.badRequest('Validation failed', { expiresAt: 'Expiry must be on or after the event date' });
  }
}

exports.createBulletin = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  checkDates(data);
  const doc = await Bulletin.create(data);
  res.status(201).json(doc);
});

exports.updateBulletin = asyncHandler(async (req, res) => {
  const doc = await Bulletin.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Bulletin');
  doc.set(pick(req.body));
  checkDates(doc);
  await doc.save();
  res.json(doc);
});

exports.deleteBulletin = asyncHandler(async (req, res) => {
  const doc = await Bulletin.findByIdAndDelete(req.params.id);
  if (!doc) throw ApiError.notFound('Bulletin');
  res.json({ message: 'Bulletin deleted', id: req.params.id });
});
