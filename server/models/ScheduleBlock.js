const mongoose = require('mongoose');

const scheduleBlockSchema = new mongoose.Schema(
  {
    date: { type: Date, required: [true, 'Date is required'], unique: true },
    reason: { type: String, required: [true, 'Reason is required'], trim: true, minlength: [3, 'Reason is too short'], maxlength: 120 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ScheduleBlock', scheduleBlockSchema);
