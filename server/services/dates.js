const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

function toIsoDay(date = new Date()) {
  return new Date(new Date(date).getTime() + PH_OFFSET_MS).toISOString().slice(0, 10);
}

function dayStart(isoDay) {
  return new Date(`${isoDay}T00:00:00.000Z`);
}

function isValidIsoDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const d = dayStart(value);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function daysBetween(a, b) {
  return Math.round((dayStart(toIsoDay(b)) - dayStart(toIsoDay(a))) / MS_PER_DAY);
}

function addDays(isoDay, n) {
  return toIsoDay(new Date(dayStart(isoDay).getTime() + n * MS_PER_DAY));
}

function ageOn(birthdate, on = new Date()) {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const d = new Date(on);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  const m = d.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && d.getUTCDate() < b.getUTCDate())) age -= 1;
  return age;
}

function weekday(isoDay) {
  return dayStart(isoDay).getUTCDay();
}

module.exports = { MS_PER_DAY, toIsoDay, dayStart, isValidIsoDay, daysBetween, addDays, ageOn, weekday };
