const DocumentRequest = require('../models/DocumentRequest');
const ScheduleBlock = require('../models/ScheduleBlock');
const { toIsoDay, dayStart, isValidIsoDay, weekday, daysBetween } = require('./dates');

const { SLOTS } = DocumentRequest;
const SLOT_CAPACITY = 3;
const MAX_DAYS_AHEAD = 60;
const ACTIVE_STATUSES = ['pending', 'processing', 'ready'];

async function getAvailability(isoDay, excludeRequestId) {
  if (!isValidIsoDay(isoDay)) {
    const err = new Error('date must be a valid YYYY-MM-DD');
    err.statusCode = 400;
    throw err;
  }
  const today = toIsoDay();
  const daysAhead = daysBetween(dayStart(today), dayStart(isoDay));
  const block = await ScheduleBlock.findOne({ date: dayStart(isoDay) });

  let closedReason = null;
  if (daysAhead < 1) closedReason = 'Pickup must be at least 1 day from today';
  else if (daysAhead > MAX_DAYS_AHEAD) closedReason = `Pickup can be booked up to ${MAX_DAYS_AHEAD} days ahead`;
  else if ([0, 6].includes(weekday(isoDay))) closedReason = 'Barangay Hall is closed on weekends';
  else if (block) closedReason = `Closed: ${block.reason}`;

  const filter = { pickupDate: dayStart(isoDay), status: { $in: ACTIVE_STATUSES } };
  if (excludeRequestId) filter._id = { $ne: excludeRequestId };
  const booked = await DocumentRequest.find(filter).select('pickupSlot');
  const counts = {};
  booked.forEach((r) => { counts[r.pickupSlot] = (counts[r.pickupSlot] || 0) + 1; });

  const slots = SLOTS.map((slot) => {
    const taken = counts[slot] || 0;
    const remaining = closedReason ? 0 : Math.max(SLOT_CAPACITY - taken, 0);
    return { slot, capacity: SLOT_CAPACITY, booked: taken, remaining, available: remaining > 0 };
  });
  const totalRemaining = slots.reduce((sum, s) => sum + s.remaining, 0);

  return {
    date: isoDay,
    isOpen: !closedReason,
    closedReason,
    slots,
    totalCapacity: SLOTS.length * SLOT_CAPACITY,
    totalBooked: booked.length,
    totalRemaining,
    isFull: !closedReason && totalRemaining === 0,
  };
}

async function assertSlotBookable(isoDay, slot, excludeRequestId) {
  if (!SLOTS.includes(slot)) {
    const err = new Error(`pickupSlot must be one of: ${SLOTS.join(', ')}`);
    err.statusCode = 400;
    err.errors = { pickupSlot: 'Choose a valid time slot' };
    throw err;
  }
  const day = await getAvailability(isoDay, excludeRequestId);
  if (!day.isOpen) {
    const err = new Error(day.closedReason);
    err.statusCode = 400;
    err.errors = { pickupDate: day.closedReason };
    throw err;
  }
  const s = day.slots.find((x) => x.slot === slot);
  if (!s.available) {
    const err = new Error(`The ${slot} slot on ${isoDay} is already full`);
    err.statusCode = 400;
    err.errors = { pickupSlot: 'This slot is full. Choose another time.' };
    throw err;
  }
}

module.exports = { SLOTS, SLOT_CAPACITY, MAX_DAYS_AHEAD, ACTIVE_STATUSES, getAvailability, assertSlotBookable };
