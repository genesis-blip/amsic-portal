const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const STAFF_ROLES = ['super_admin', 'captain', 'secretary', 'treasurer', 'health_worker', 'tanod'];

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9._-]{4,30}$/, 'Use 4 to 30 letters, numbers, dots, dashes or underscores'],
    },
    email: { type: String, trim: true, lowercase: true, match: [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'], default: '' },
    passwordHash: { type: String, select: false },
    legacyHash: { type: { hash: String, salt: String }, select: false, default: undefined },
    accountType: { type: String, enum: ['resident', 'staff'], required: true },
    role: {
      type: String,
      enum: { values: [...STAFF_ROLES, null], message: 'Invalid role' },
      default: null,
      validate: { validator(v) { return this.accountType !== 'staff' || !!v; }, message: 'Staff accounts need a role' },
    },
    resident: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' },
    mobile: { type: String, trim: true, match: [/^$|^09\d{9}$/, 'Use 11 digits starting with 09'], default: '' },
    otp: { type: { hash: String, expiresAt: Date, attempts: Number, sentAt: Date }, select: false, default: undefined },
    firstName: { type: String, trim: true, maxlength: 60, default: '' },
    lastName: { type: String, trim: true, maxlength: 60, default: '' },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    firebaseUid: { type: String, index: true, sparse: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.passwordHash; delete ret.legacyHash; delete ret.otp; delete ret.__v; return ret; },
    },
  },
);

userSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim() || this.username;
});

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
  this.legacyHash = undefined;
};

module.exports = mongoose.model('User', userSchema);
module.exports.STAFF_ROLES = STAFF_ROLES;
