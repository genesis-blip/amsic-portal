const mongoose = require('mongoose');

const documentTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Code is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9_-]{2,30}$/, 'Code may only use letters, numbers, - and _'],
    },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    fee: { type: Number, required: [true, 'Fee is required'], min: [0, 'Fee cannot be negative'], max: [5000, 'Fee is too high'] },
    processingDays: { type: Number, min: [0, 'Cannot be negative'], max: [30, 'Max 30 days'], default: 1 },
    requirements: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('DocumentType', documentTypeSchema);
