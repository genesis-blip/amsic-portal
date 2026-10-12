const mongoose = require('mongoose');

const bulletinSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, minlength: [4, 'Title is too short'], maxlength: 120 },
    content: { type: String, required: [true, 'Content is required'], trim: true, minlength: [10, 'Content is too short'], maxlength: 3000 },
    category: {
      type: String,
      enum: { values: ['announcement', 'event', 'advisory', 'health', 'emergency'], message: 'Invalid category' },
      default: 'announcement',
    },
    eventDate: { type: Date },
    expiresAt: { type: Date },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

bulletinSchema.virtual('isExpired').get(function isExpired() {
  return !!this.expiresAt && this.expiresAt < new Date();
});

module.exports = mongoose.model('Bulletin', bulletinSchema);
