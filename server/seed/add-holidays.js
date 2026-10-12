require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const ScheduleBlock = require('../models/ScheduleBlock');
const { philippineHolidays } = require('../services/holidays');
const { toIsoDay, dayStart } = require('../services/dates');

async function addHolidays({ log = console.log } = {}) {
  const today = toIsoDay();
  const year = Number(today.slice(0, 4));
  const days = [...philippineHolidays(year), ...philippineHolidays(year + 1)].filter((h) => h.date >= today);
  let added = 0;
  for (const h of days) {
    const res = await ScheduleBlock.updateOne({ date: dayStart(h.date) }, { $setOnInsert: { reason: h.reason } }, { upsert: true });
    if (res.upsertedCount) added += 1;
  }
  log(`Holidays: ${added} closed day(s) added, ${days.length - added} were already there.`);
  return added;
}

module.exports = { addHolidays };

if (require.main === module) {
  connectDB()
    .then(() => addHolidays())
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
      console.error('Could not add holidays:', err.message);
      await mongoose.disconnect();
      process.exit(1);
    });
}
