const { ageOn } = require('./dates');

const SENIOR_AGE = 60;
const SENIOR_DISCOUNT_RATE = 0.2;
const FREE_CODES = ['indigency'];

const round2 = (n) => Math.round(n * 100) / 100;

function computeFees(documentType, copies, birthdate, on = new Date()) {
  const n = Number(copies);
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    const err = new Error('Copies must be a whole number from 1 to 10');
    err.statusCode = 400;
    throw err;
  }
  const isFree = FREE_CODES.includes(documentType.code);
  const unitFee = isFree ? 0 : Number(documentType.fee) || 0;
  const subtotal = round2(unitFee * n);
  const age = ageOn(birthdate, on);
  const isSenior = age !== null && age >= SENIOR_AGE;
  const discountRate = isSenior && subtotal > 0 ? SENIOR_DISCOUNT_RATE : 0;
  const discount = round2(subtotal * discountRate);
  const total = round2(subtotal - discount);
  return { unitFee, copies: n, subtotal, isSenior, discountRate, discount, total, isFree };
}

module.exports = { computeFees, SENIOR_AGE, SENIOR_DISCOUNT_RATE, FREE_CODES };
