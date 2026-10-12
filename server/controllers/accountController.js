const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { escapeRegex, parsePaging } = require('../utils/query');
const { hasPermission } = require('../services/permissions');
const { passwordProblem } = require('./authController');

function assertCanManage(actor, accountType) {
  const cap = accountType === 'staff' ? 'staff.manage' : 'residents.manage';
  if (!hasPermission(actor, cap)) throw new ApiError(403, 'Your role does not have access to this action');
}

function tempPassword() {
  const n = crypto.randomInt(1000, 9999);
  const letters = Array.from({ length: 2 }, () => 'abcdefghjkmnpqrstuvwxyz'[crypto.randomInt(23)]).join('');
  return `amsic-${n}-${letters}`;
}

exports.listAccounts = asyncHandler(async (req, res) => {
  const type = req.query.type === 'resident' ? 'resident' : 'staff';
  assertCanManage(req.user, type);
  const filter = { accountType: type };
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search && String(req.query.search).trim()) {
    const rx = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
    filter.$or = [{ username: rx }, { email: rx }, { firstName: rx }, { lastName: rx }];
  }
  const { limit, page, skip } = parsePaging(req.query);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ accountType: 1, lastName: 1, username: 1 }).skip(skip).limit(limit)
      .populate('resident', 'firstName lastName residentNo purok'),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) });
});

exports.createStaff = asyncHandler(async (req, res) => {
  assertCanManage(req.user, 'staff');
  const { username, firstName, lastName, email, role, mobile } = req.body;
  const given = req.body.password ? String(req.body.password) : '';
  const problem = given ? passwordProblem(given) : null;
  if (problem) throw ApiError.badRequest('Validation failed', { password: problem });
  const errors = {};
  if (!String(firstName || '').trim()) errors.firstName = 'First name is required';
  if (!String(lastName || '').trim()) errors.lastName = 'Last name is required';
  if (username && await User.exists({ username: String(username).trim().toLowerCase() })) errors.username = 'This username is already taken';
  const user = new User({ username, firstName, lastName, email: email || '', mobile: mobile || '', role, accountType: 'staff', mustChangePassword: !given });
  const vErr = await user.validate().then(() => null, (e) => e);
  if (vErr?.errors) Object.values(vErr.errors).forEach((x) => { errors[x.path] = errors[x.path] || x.message; });
  if (Object.keys(errors).length) throw ApiError.badRequest('Validation failed', errors);
  const password = given || tempPassword();
  await user.setPassword(password);
  await user.save();
  res.status(201).json({ account: user, temporaryPassword: given ? undefined : password });
});

exports.updateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Account');
  assertCanManage(req.user, user.accountType);
  const isSelf = String(user._id) === String(req.user._id);
  if (isSelf && (req.body.isActive === false || (req.body.role && req.body.role !== user.role))) {
    throw ApiError.badRequest('You cannot deactivate your own account or change your own role');
  }
  const allowed = user.accountType === 'staff' ? ['role', 'isActive', 'firstName', 'lastName', 'email', 'mobile'] : ['isActive', 'email'];
  allowed.forEach((k) => { if (req.body[k] !== undefined) user[k] = req.body[k]; });
  await user.save();
  res.json(user);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Account');
  assertCanManage(req.user, user.accountType);
  const password = tempPassword();
  await user.setPassword(password);
  user.mustChangePassword = true;
  await user.save();
  res.json({ message: `Temporary password for ${user.username}`, temporaryPassword: password });
});
