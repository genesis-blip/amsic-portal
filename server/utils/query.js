function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchFilter(search, fields) {
  if (!search || !String(search).trim()) return {};
  const rx = new RegExp(escapeRegex(String(search).trim()), 'i');
  return { $or: fields.map((f) => ({ [f]: rx })) };
}

function parseSort(sort, allowed, fallback = '-createdAt') {
  const value = allowed.includes(String(sort || '').replace(/^-/, '')) ? String(sort) : fallback;
  return value.startsWith('-') ? { [value.slice(1)]: -1 } : { [value]: 1 };
}

function parsePaging(query, defaultLimit = 20) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 100);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { limit, page, skip: (page - 1) * limit };
}

function dateRange(from, to) {
  const range = {};
  if (from) range.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999Z`);
  return Object.keys(range).length ? range : null;
}

async function paginate(Model, filter, { sort, skip, limit, page }, populate) {
  let q = Model.find(filter).sort(sort).skip(skip).limit(limit);
  if (populate) q = q.populate(populate);
  const [items, total] = await Promise.all([q, Model.countDocuments(filter)]);
  return { items, total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) };
}

module.exports = { escapeRegex, searchFilter, parseSort, parsePaging, dateRange, paginate };
