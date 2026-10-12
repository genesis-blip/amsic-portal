const Counter = require('../models/Counter');

async function nextNumber(prefix, pad = 5, year = new Date().getFullYear()) {
  const key = `${prefix}-${year}`;
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return `${prefix}-${year}-${String(counter.value).padStart(pad, '0')}`;
}

module.exports = { nextNumber };
