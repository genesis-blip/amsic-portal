const mongoose = require('mongoose');

const STATUSES = ['pending', 'processing', 'ready', 'released', 'rejected', 'cancelled'];
const SLOTS = ['08:00-09:00', '09:00-10:00', '13:00-14:00', '14:00-15:00'];

const statusEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const documentRequestSchema = new mongoose.Schema(
  {
    referenceNumber: { type: String, unique: true },
    resident: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: [true, 'Resident is required'] },
    documentType: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentType', required: [true, 'Document type is required'] },
    purpose: { type: String, required: [true, 'Purpose is required'], trim: true, minlength: [3, 'Purpose is too short'], maxlength: 200 },
    copies: { type: Number, required: true, min: [1, 'At least 1 copy'], max: [10, 'At most 10 copies'], default: 1 },
    pickupDate: { type: Date, required: [true, 'Pickup date is required'] },
    pickupSlot: { type: String, required: [true, 'Pickup time is required'], enum: { values: SLOTS, message: 'Invalid pickup time' } },
    fees: {
      unitFee: { type: Number, min: 0, required: true },
      subtotal: { type: Number, min: 0, required: true },
      discountRate: { type: Number, min: 0, max: 1, default: 0 },
      discount: { type: Number, min: 0, default: 0 },
      total: { type: Number, min: 0, required: true },
    },
    isSenior: { type: Boolean, default: false },
    status: { type: String, enum: { values: STATUSES, message: 'Invalid status' }, default: 'pending' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'waived'], default: 'unpaid' },
    statusHistory: { type: [statusEntrySchema], default: [] },
    releasedAt: { type: Date },
    remarks: { type: String, trim: true, maxlength: 300, default: '' },
    onlinePayment: {
      type: { paymentIntentId: String, qrImage: String, expiresAt: Date, status: String, paymentId: String },
      select: false,
      default: undefined,
    },
  },
  { timestamps: true },
);

documentRequestSchema.index({ pickupDate: 1, pickupSlot: 1, status: 1 });
documentRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
module.exports.STATUSES = STATUSES;
module.exports.SLOTS = SLOTS;
