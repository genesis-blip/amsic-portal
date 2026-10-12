const DocumentType = require('../models/DocumentType');
const DocumentRequest = require('../models/DocumentRequest');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { searchFilter } = require('../utils/query');

const EDITABLE = ['code', 'name', 'description', 'fee', 'processingDays', 'requirements', 'isActive'];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

exports.listDocumentTypes = asyncHandler(async (req, res) => {
  const filter = { ...searchFilter(req.query.search, ['name', 'code', 'description']) };
  if (req.query.active === 'true') filter.isActive = true;
  const types = await DocumentType.find(filter).sort({ name: 1 });
  const counts = await DocumentRequest.aggregate([{ $group: { _id: '$documentType', count: { $sum: 1 } } }]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  res.json(types.map((t) => ({ ...t.toJSON(), timesRequested: byId[String(t._id)] || 0 })));
});

exports.getDocumentType = asyncHandler(async (req, res) => {
  const type = await DocumentType.findById(req.params.id);
  if (!type) throw ApiError.notFound('Document type');
  res.json(type);
});

exports.createDocumentType = asyncHandler(async (req, res) => {
  const type = await DocumentType.create(pick(req.body));
  res.status(201).json(type);
});

exports.updateDocumentType = asyncHandler(async (req, res) => {
  const type = await DocumentType.findById(req.params.id);
  if (!type) throw ApiError.notFound('Document type');
  type.set(pick(req.body));
  await type.save();
  res.json(type);
});

exports.deleteDocumentType = asyncHandler(async (req, res) => {
  const type = await DocumentType.findById(req.params.id);
  if (!type) throw ApiError.notFound('Document type');
  const used = await DocumentRequest.countDocuments({ documentType: type._id });
  if (used > 0) throw ApiError.badRequest(`Cannot delete: used by ${used} request(s). Set it as inactive instead.`);
  await type.deleteOne();
  res.json({ message: 'Document type deleted', id: req.params.id });
});
