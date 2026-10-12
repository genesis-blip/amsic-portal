const mongoose = require('mongoose');

const TYPES = ['noise', 'theft', 'vandalism', 'dispute', 'accident', 'fire', 'flood', 'stray_animal', 'other'];
const URGENCY = ['low', 'medium', 'high', 'critical'];

const incidentSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' },
    reporterName: { type: String, required: [true, 'Reporter name is required'], trim: true, maxlength: 120 },
    type: { type: String, required: [true, 'Type is required'], enum: { values: TYPES, message: 'Invalid incident type' } },
    description: { type: String, required: [true, 'Description is required'], trim: true, minlength: [10, 'Describe the incident in at least 10 characters'], maxlength: 1000 },
    location: { type: String, required: [true, 'Location is required'], trim: true, maxlength: 200 },
    occurredAt: {
      type: Date,
      required: [true, 'Date of incident is required'],
      validate: { validator: (d) => d <= new Date(Date.now() + 60 * 1000), message: 'Incident date cannot be in the future' },
    },
    urgency: { type: String, enum: { values: URGENCY, message: 'Invalid urgency' }, default: 'medium' },
    status: { type: String, enum: ['open', 'under_review', 'resolved', 'dismissed'], default: 'open' },
    resolutionNotes: { type: String, trim: true, maxlength: 1000, default: '' },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Incident', incidentSchema);
module.exports.TYPES = TYPES;
module.exports.URGENCY = URGENCY;
