const mongoose = require('mongoose');

const STATUSES = ['filed', 'for_hearing', 'mediation', 'settled', 'escalated', 'dismissed'];

const actionSchema = new mongoose.Schema(
  {
    action: { type: String, required: [true, 'Action is required'], trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

const blotterSchema = new mongoose.Schema(
  {
    caseNumber: { type: String, unique: true },
    complainant: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' },
    complainantName: { type: String, required: [true, 'Complainant is required'], trim: true, maxlength: 120 },
    respondentName: { type: String, required: [true, 'Respondent is required'], trim: true, maxlength: 120 },
    nature: { type: String, required: [true, 'Nature of complaint is required'], trim: true, maxlength: 120 },
    details: { type: String, required: [true, 'Details are required'], trim: true, minlength: [10, 'Add at least 10 characters of details'], maxlength: 2000 },
    incidentDate: { type: Date, required: [true, 'Incident date is required'] },
    hearingDate: { type: Date },
    status: { type: String, enum: { values: STATUSES, message: 'Invalid status' }, default: 'filed' },
    actions: { type: [actionSchema], default: [] },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model('BlotterRecord', blotterSchema);
module.exports.STATUSES = STATUSES;
