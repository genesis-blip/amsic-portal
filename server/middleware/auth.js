const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { hasPermission } = require('../services/permissions');

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is missing. Add it to server/.env');
  return secret;
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id), type: user.accountType }, jwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

function signOtpToken(user) {
  return jwt.sign({ sub: String(user._id), purpose: 'otp' }, jwtSecret(), { expiresIn: '10m' });
}

function signResetToken(login) {
  return jwt.sign({ sub: String(login), purpose: 'reset' }, jwtSecret(), { expiresIn: '15m' });
}

function verifyResetToken(token) {
  try {
    const payload = jwt.verify(String(token || ''), jwtSecret());
    if (payload.purpose !== 'reset') throw new Error('wrong token');
    return payload;
  } catch {
    throw new ApiError(401, 'The reset code has expired. Start again with "Forgot password?"');
  }
}

function verifyOtpToken(token) {
  try {
    const payload = jwt.verify(String(token || ''), jwtSecret());
    if (payload.purpose !== 'otp') throw new Error('wrong token');
    return payload;
  } catch {
    throw new ApiError(401, 'The log in code has expired. Please log in again');
  }
}

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Please log in first');
  let payload;
  try {
    payload = jwt.verify(token, jwtSecret());
    if (payload.purpose) throw new Error('not a session token');
  } catch {
    throw new ApiError(401, 'Your session has expired. Please log in again');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'This account is no longer active');
  req.user = user;
  next();
});

const requireStaff = (req, res, next) => {
  if (req.user?.accountType !== 'staff') return next(new ApiError(403, 'This page is for barangay staff only'));
  return next();
};

const requireResident = (req, res, next) => {
  if (req.user?.accountType !== 'resident' || !req.user.resident) return next(new ApiError(403, 'This page is for residents only'));
  return next();
};

const can = (capability) => (req, res, next) => {
  if (!hasPermission(req.user, capability)) return next(new ApiError(403, 'Your role does not have access to this action'));
  return next();
};

module.exports = { signToken, signOtpToken, verifyOtpToken, signResetToken, verifyResetToken, requireAuth, requireStaff, requireResident, can };
