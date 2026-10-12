const mongoose = require('mongoose');
const { ageOn } = require('../services/dates');

const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6', 'Purok 7'];

const residentSchema = new mongoose.Schema(
  {
    residentNo: { type: String, unique: true },
    firstName: { type: String, required: [true, 'First name is required'], trim: true, maxlength: 60 },
    middleName: { type: String, trim: true, maxlength: 60, default: '' },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true, maxlength: 60 },
    suffix: { type: String, trim: true, maxlength: 10, default: '' },
    birthdate: {
      type: Date,
      required: [true, 'Birthdate is required'],
      validate: { validator: (d) => d <= new Date(), message: 'Birthdate cannot be in the future' },
    },
    sex: { type: String, required: [true, 'Sex is required'], enum: { values: ['male', 'female'], message: 'Sex must be male or female' } },
    civilStatus: {
      type: String,
      enum: { values: ['single', 'married', 'widowed', 'separated'], message: 'Invalid civil status' },
      default: 'single',
    },
    purok: { type: String, required: [true, 'Purok is required'], enum: { values: PUROKS, message: 'Invalid purok' } },
    address: { type: String, required: [true, 'Address is required'], trim: true, maxlength: 200 },
    contactNumber: {
      type: String,
      trim: true,
      match: [/^09\d{9}$/, 'Contact number must be 11 digits starting with 09'],
    },
    email: { type: String, trim: true, lowercase: true, match: [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'], default: '' },
    occupation: { type: String, trim: true, maxlength: 80, default: '' },
    isVoter: { type: Boolean, default: false },
    residencyType: {
      type: String,
      enum: { values: ['non_migrant', 'migrant', 'transient'], message: 'Invalid residency type' },
      default: 'non_migrant',
    },
    yearsOfResidency: { type: Number, min: [0, 'Years cannot be negative'], max: [120, 'Years is too large'], default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

residentSchema.virtual('fullName').get(function fullName() {
  return [this.firstName, this.middleName ? `${this.middleName[0]}.` : '', this.lastName, this.suffix].filter(Boolean).join(' ');
});
residentSchema.virtual('age').get(function age() { return ageOn(this.birthdate); });
residentSchema.virtual('isSenior').get(function isSenior() { return (ageOn(this.birthdate) ?? 0) >= 60; });

residentSchema.index({ lastName: 1, firstName: 1 });

module.exports = mongoose.model('Resident', residentSchema);
module.exports.PUROKS = PUROKS;
