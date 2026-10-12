const ScheduleBlock = require('../models/ScheduleBlock');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getAvailability } = require('../services/scheduleService');
const { isValidIsoDay, dayStart, toIsoDay } = require('../services/dates');

exports.getAvailability = asyncHandler(async (req, res) => {
  res.json(await getAvailability(req.query.date));
});

exports.getCalendar = asyncHandler(async (req, res) => {
  const month = String(req.query.month || toIsoDay().slice(0, 7));
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw ApiError.badRequest('month must be YYYY-MM');
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${month}-${String(d).padStart(2, '0')}`;
    const a = await getAvailability(iso);
    days.push({ date: iso, isOpen: a.isOpen, closedReason: a.closedReason, totalRemaining: a.totalRemaining, totalBooked: a.totalBooked, isFull: a.isFull });
  }
  res.json({ month, days, openDays: days.filter((d) => d.isOpen).length, fullDays: days.filter((d) => d.isFull).length });
});

exports.listBlocks = asyncHandler(async (req, res) => {
  const blocks = await ScheduleBlock.find({ date: { $gte: dayStart(toIsoDay()) } }).sort({ date: 1 });
  res.json(blocks);
});

exports.createBlock = asyncHandler(async (req, res) => {
  const { date, reason } = req.body;
  if (!isValidIsoDay(date)) throw ApiError.badRequest('date must be YYYY-MM-DD', { date: 'Choose a valid date' });
  const block = await ScheduleBlock.create({ date: dayStart(date), reason });
  res.status(201).json(block);
});

exports.deleteBlock = asyncHandler(async (req, res) => {
  const block = await ScheduleBlock.findByIdAndDelete(req.params.id);
  if (!block) throw ApiError.notFound('Blocked date');
  res.json({ message: 'Blocked date removed', id: req.params.id });
});
