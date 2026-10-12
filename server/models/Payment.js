const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orNumber: { type: String, unique: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentRequest' },
    resident: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' },
    payerName: { type: String, required: [true, 'Payer name is required'], trim: true, maxlength: 120 },
    amount: { type: Number, required: [true, 'Amount is required'], min: [1, 'Amount must be at least 1'], max: [100000, 'Amount is too large'] },
    method: { type: String, enum: { values: ['cash', 'gcash', 'maya', 'bank_transfer', 'qrph'], message: 'Invalid payment method' }, default: 'cash' },
    category: {
      type: String,
      enum: { values: ['document_fee', 'business_fee', 'fine', 'donation', 'other'], message: 'Invalid category' },
      default: 'document_fee',
    },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    paidAt: { type: Date, default: Date.now },
    isVoided: { type: Boolean, default: false },
    voidReason: { type: String, trim: true, maxlength: 200, default: '' },
    voidedAt: { type: Date },
  },
  { timestamps: true },
);

paymentSchema.index({ paidAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
