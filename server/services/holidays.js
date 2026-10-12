function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const iso = (d) => d.toISOString().slice(0, 10);
const shift = (d, days) => new Date(d.getTime() + days * 86400000);

function heroesDay(year) {
  const d = new Date(Date.UTC(year, 7, 31));
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

function philippineHolidays(year) {
  const e = easter(year);
  return [
    [`${year}-01-01`, "New Year's Day"],
    [`${year}-02-25`, 'EDSA People Power Revolution Anniversary'],
    [iso(shift(e, -3)), 'Maundy Thursday'],
    [iso(shift(e, -2)), 'Good Friday'],
    [iso(shift(e, -1)), 'Black Saturday'],
    [`${year}-04-09`, 'Araw ng Kagitingan'],
    [`${year}-05-01`, 'Labor Day'],
    [`${year}-06-12`, 'Independence Day'],
    [`${year}-08-21`, 'Ninoy Aquino Day'],
    [iso(heroesDay(year)), 'National Heroes Day'],
    [`${year}-11-01`, "All Saints' Day"],
    [`${year}-11-02`, "All Souls' Day"],
    [`${year}-11-30`, 'Bonifacio Day'],
    [`${year}-12-08`, 'Feast of the Immaculate Conception'],
    [`${year}-12-24`, 'Christmas Eve'],
    [`${year}-12-25`, 'Christmas Day'],
    [`${year}-12-30`, 'Rizal Day'],
    [`${year}-12-31`, 'Last Day of the Year'],
  ]
    .map(([date, reason]) => ({ date, reason }))
    .filter(({ date }) => ![0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay()));
}

module.exports = { philippineHolidays, easter };
