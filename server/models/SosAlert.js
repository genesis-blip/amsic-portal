const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema(
  {
    resident: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: [true, 'Resident is required'] },
    emergencyType: {
      type: String,
      enum: { values: ['medical', 'fire', 'crime', 'flood', 'accident', 'other'], message: 'Invalid emergency type' },
      default: 'other',
    },
    message: { type: String, required: [true, 'Message is required'], trim: true, maxlength: 500 },
    location: { type: String, required: [true, 'Location is required'], trim: true, maxlength: 200 },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    status: { type: String, enum: ['active', 'acknowledged', 'resolved'], default: 'active' },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SosAlert', sosAlertSchema);
