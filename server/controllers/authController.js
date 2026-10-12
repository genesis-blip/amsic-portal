const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Resident = require('../models/Resident');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signToken, signOtpToken, verifyOtpToken, signResetToken, verifyResetToken } = require('../middleware/auth');
const sms = require('../services/sms');
const { permissionsFor, ROLE_LABELS } = require('../services/permissions');
const { verifyFirebasePassword } = require('../services/firebaseScrypt');
const { nextNumber } = require('../services/counterService');

const LOGIN_ERROR = 'Invalid username or password';
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const fails = new Map();

const RESIDENT_FIELDS = ['firstName', 'middleName', 'lastName', 'suffix', 'birthdate', 'sex', 'civilStatus', 'purok', 'address',
  'contactNumber', 'email', 'occupation'];

function passwordProblem(password) {
  const p = String(password || '');
  if (p.length < 8) return 'Use at least 8 characters';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Use both letters and numbers';
  return null;
}

async function sessionFor(user) {
  const u = user.toJSON();
  let resident = null;
  if (user.resident) resident = await Resident.findById(user.resident);
  return {
    id: u._id,
    username: u.username,
    email: u.email,
    accountType: u.accountType,
    role: u.role,
    roleLabel: u.role ? ROLE_LABELS[u.role] : 'Resident',
    name: resident ? `${resident.firstName} ${resident.lastName}` : u.fullName,
    resident: resident ? resident.toJSON() : null,
    mobile: u.mobile || '',
    mustChangePassword: u.mustChangePassword,
    permissions: permissionsFor(user),
  };
}

async function checkPassword(user, password) {
  if (user.passwordHash) return bcrypt.compare(password, user.passwordHash);
  if (user.legacyHash?.hash && verifyFirebasePassword(password, user.legacyHash.salt, user.legacyHash.hash)) {
    await user.setPassword(password);
    return true;
  }
  return false;
}

const OTP_MINUTES = 5;
const OTP_MAX_TRIES = 5;
const otpHash = (user, code) => crypto.createHash('sha256').update(`${user._id}:${code}`).digest('hex');
const otpOn = () => sms.isEnabled() && process.env.LOGIN_OTP === 'on';

async function mobileFor(user) {
  if (user.accountType === 'staff') return sms.toLocalMobile(user.mobile);
  const r = user.resident ? await Resident.findById(user.resident).select('contactNumber') : null;
  return sms.toLocalMobile(r?.contactNumber);
}

async function issueOtp(user, mobile) {
  const code = String(crypto.randomInt(100000, 1000000));
  user.otp = { hash: otpHash(user, code), expiresAt: new Date(Date.now() + OTP_MINUTES * 60000), attempts: 0, sentAt: new Date() };
  await user.save();
  return sms.sendLoginCode(mobile, code);
}

async function finishLogin(user, res) {
  user.otp = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ token: signToken(user), user: await sessionFor(user) });
}

exports.login = asyncHandler(async (req, res) => {
  const login = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const portal = req.body.portal === 'staff' ? 'staff' : 'resident';
  const errors = {};
  if (!login) errors.username = 'Enter your username or email';
  if (!password) errors.password = 'Enter your password';
  if (Object.keys(errors).length) throw ApiError.badRequest('Validation failed', errors);

  const lock = fails.get(login);
  if (lock && lock.until > Date.now()) {
    const minutes = Math.ceil((lock.until - Date.now()) / 60000);
    throw new ApiError(429, `Too many failed attempts. Try again in ${minutes} minute(s)`);
  }

  const user = await User.findOne({ $or: [{ username: login }, { email: login }] }).select('+passwordHash +legacyHash');
  const ok = !!user && (await checkPassword(user, password));
  if (!ok) {
    const count = (lock && lock.until === 0 ? lock.count : 0) + 1;
    fails.set(login, { count, until: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
    throw new ApiError(401, LOGIN_ERROR);
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated. Please visit the barangay hall');
  if (user.accountType !== portal) {
    throw new ApiError(403, portal === 'staff'
      ? 'This is a resident account. Use the resident login instead'
      : 'This is a staff account. Use the staff portal login instead');
  }
  fails.delete(login);

  if (otpOn()) {
    const mobile = await mobileFor(user);
    if (mobile && await issueOtp(user, mobile)) {
      return res.json({ otpRequired: true, otpToken: signOtpToken(user), sentTo: sms.maskMobile(mobile), expiresInMinutes: OTP_MINUTES });
    }
  }
  return finishLogin(user, res);
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const { sub } = verifyOtpToken(req.body.otpToken);
  const code = String(req.body.code || '').trim();
  if (!/^\d{6}$/.test(code)) throw ApiError.badRequest('Validation failed', { code: 'Enter the 6-digit code' });
  const user = await User.findById(sub).select('+otp');
  if (!user || !user.isActive || !user.otp?.hash) throw new ApiError(401, 'The log in code has expired. Please log in again');
  if (user.otp.expiresAt < new Date()) throw ApiError.badRequest('Validation failed', { code: 'This code has expired. Tap "Send a new code"' });
  if (user.otp.attempts >= OTP_MAX_TRIES) throw new ApiError(429, 'Too many wrong codes. Please log in again');
  const ok = crypto.timingSafeEqual(Buffer.from(otpHash(user, code)), Buffer.from(user.otp.hash));
  if (!ok) {
    user.otp.attempts += 1;
    user.markModified('otp');
    await user.save();
    throw ApiError.badRequest('Validation failed', { code: `Wrong code. ${OTP_MAX_TRIES - user.otp.attempts} tries left` });
  }
  return finishLogin(user, res);
});

exports.resendOtp = asyncHandler(async (req, res) => {
  const { sub } = verifyOtpToken(req.body.otpToken);
  const user = await User.findById(sub).select('+otp');
  if (!user || !user.isActive) throw new ApiError(401, 'Please log in again');
  const wait = user.otp?.sentAt ? 60 - Math.floor((Date.now() - user.otp.sentAt) / 1000) : 0;
  if (wait > 0) throw new ApiError(429, `Wait ${wait} seconds before asking for a new code`);
  const mobile = await mobileFor(user);
  if (!mobile || !(await issueOtp(user, mobile))) throw new ApiError(502, 'The code could not be sent. Try again in a minute');
  res.json({ message: `A new code was sent to ${sms.maskMobile(mobile)}`, otpToken: signOtpToken(user) });
});

const RESET_MINUTES = 10;
const resetHash = (user, code) => crypto.createHash('sha256').update(`reset:${user._id}:${code}`).digest('hex');
const findByLogin = (login) => User.findOne({ $or: [{ username: login }, { email: login }] });

exports.forgotPassword = asyncHandler(async (req, res) => {
  const login = String(req.body.username || '').trim().toLowerCase();
  if (!login) throw ApiError.badRequest('Validation failed', { username: 'Enter your username or email' });
  if (!sms.isEnabled()) {
    throw new ApiError(503, 'Password reset by text message is not available right now. Please visit the barangay hall with a valid ID');
  }
  const user = await findByLogin(login).select('+otp');
  if (user && user.isActive) {
    const recent = user.otp?.sentAt && Date.now() - user.otp.sentAt < 60000;
    const mobile = recent ? null : await mobileFor(user);
    if (mobile) {
      const code = String(crypto.randomInt(100000, 1000000));
      user.otp = { hash: resetHash(user, code), expiresAt: new Date(Date.now() + RESET_MINUTES * 60000), attempts: 0, sentAt: new Date() };
      await user.save();
      await sms.sendResetCode(mobile, code);
    }
  }
  res.json({
    message: 'If the account has a mobile number on file, we texted a 6-digit code to it.',
    resetToken: signResetToken(login),
    expiresInMinutes: RESET_MINUTES,
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { sub: login } = verifyResetToken(req.body.resetToken);
  const code = String(req.body.code || '').trim();
  const { newPassword } = req.body;
  const errors = {};
  if (!/^\d{6}$/.test(code)) errors.code = 'Enter the 6-digit code from the text message';
  const problem = passwordProblem(newPassword);
  if (problem) errors.newPassword = problem;
  if (Object.keys(errors).length) throw ApiError.badRequest('Validation failed', errors);

  const user = await findByLogin(login).select('+otp +passwordHash');
  if (!user || !user.isActive || !user.otp?.hash) throw ApiError.badRequest('Validation failed', { code: 'Wrong code' });
  if (user.otp.expiresAt < new Date()) throw ApiError.badRequest('Validation failed', { code: 'This code has expired. Ask for a new one' });
  if (user.otp.attempts >= OTP_MAX_TRIES) throw new ApiError(429, 'Too many wrong codes. Ask for a new code');
  const ok = crypto.timingSafeEqual(Buffer.from(resetHash(user, code)), Buffer.from(user.otp.hash));
  if (!ok) {
    user.otp.attempts += 1;
    user.markModified('otp');
    await user.save();
    throw ApiError.badRequest('Validation failed', { code: `Wrong code. ${OTP_MAX_TRIES - user.otp.attempts} tries left` });
  }
  await user.setPassword(newPassword);
  user.otp = undefined;
  user.mustChangePassword = false;
  await user.save();
  fails.delete(login);
  res.json({ message: 'Password changed. You can now sign in with your new password', username: user.username });
});

exports.register = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const errors = {};
  const pwProblem = passwordProblem(password);
  if (pwProblem) errors.password = pwProblem;
  if (username && await User.exists({ username: String(username).trim().toLowerCase() })) errors.username = 'This username is already taken';
  if (req.body.email && await User.exists({ email: String(req.body.email).trim().toLowerCase() })) errors.email = 'This email already has an account';

  const data = Object.fromEntries(RESIDENT_FIELDS.filter((k) => req.body[k] !== undefined).map((k) => [k, req.body[k]]));
  if (data.contactNumber === '') delete data.contactNumber;

  let resident = null;
  if (data.firstName && data.lastName && data.birthdate) {
    const rx = (s) => new RegExp(`^${String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const match = await Resident.findOne({ firstName: rx(data.firstName), lastName: rx(data.lastName), birthdate: new Date(data.birthdate) });
    if (match && !(await User.exists({ resident: match._id }))) resident = match;
    else if (match) errors.firstName = 'This resident already has an account. Use Log in or ask the barangay hall to reset it';
  }
  if (!resident) resident = new Resident(data);

  const user = new User({ username, email: data.email || '', accountType: 'resident', resident: resident._id });
  const [rErr, uErr] = await Promise.all([resident.validate().then(() => null, (e) => e), user.validate().then(() => null, (e) => e)]);
  for (const e of [rErr, uErr]) if (e?.errors) Object.values(e.errors).forEach((x) => { errors[x.path] = errors[x.path] || x.message; });
  if (Object.keys(errors).length) throw ApiError.badRequest('Validation failed', errors);

  if (resident.isNew) {
    resident.residentNo = await nextNumber('AMS');
    await resident.save();
  }
  await user.setPassword(password);
  user.lastLoginAt = new Date();
  await user.save();
  res.status(201).json({ token: signToken(user), user: await sessionFor(user) });
});

exports.me = asyncHandler(async (req, res) => {
  res.json(await sessionFor(req.user));
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash +legacyHash');
  const errors = {};
  if (!(await checkPassword(user, String(currentPassword || '')))) errors.currentPassword = 'Current password is incorrect';
  const problem = passwordProblem(newPassword);
  if (problem) errors.newPassword = problem;
  else if (newPassword === currentPassword) errors.newPassword = 'Choose a password different from the current one';
  if (Object.keys(errors).length) throw ApiError.badRequest('Validation failed', errors);
  await user.setPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();
  res.json({ message: 'Password changed', user: await sessionFor(user) });
});

exports.updateMe = asyncHandler(async (req, res) => {
  if (req.user.accountType !== 'staff') throw new ApiError(403, 'Residents update their number in My profile');
  if (req.body.mobile !== undefined) req.user.mobile = String(req.body.mobile).trim();
  await req.user.save();
  res.json(await sessionFor(req.user));
});

exports.passwordProblem = passwordProblem;
exports.sessionFor = sessionFor;
