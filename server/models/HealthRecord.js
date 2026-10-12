const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
  {
    resident: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: [true, 'Resident is required'] },
    recordType: {
      type: String,
      required: [true, 'Record type is required'],
      enum: { values: ['checkup', 'vaccination', 'prenatal', 'senior_monitoring'], message: 'Invalid record type' },
    },
    visitDate: { type: Date, required: [true, 'Visit date is required'] },
    weightKg: { type: Number, min: [1, 'Weight is too low'], max: [300, 'Weight is too high'] },
    heightCm: { type: Number, min: [30, 'Height is too low'], max: [250, 'Height is too high'] },
    systolic: { type: Number, min: [50, 'Too low'], max: [260, 'Too high'] },
    diastolic: { type: Number, min: [30, 'Too low'], max: [160, 'Too high'] },
    vaccineName: { type: String, trim: true, maxlength: 80, default: '' },
    doseNumber: { type: Number, min: [1, 'Dose starts at 1'], max: [10, 'Too many doses'] },
    nextDueDate: { type: Date },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

healthRecordSchema.virtual('bmi').get(function bmi() {
  if (!this.weightKg || !this.heightCm) return null;
  const m = this.heightCm / 100;
  return Math.round((this.weightKg / (m * m)) * 10) / 10;
});

healthRecordSchema.virtual('bmiCategory').get(function bmiCategory() {
  const b = this.bmi;
  if (b === null) return null;
  if (b < 18.5) return 'underweight';
  if (b < 25) return 'normal';
  if (b < 30) return 'overweight';
  return 'obese';
});

healthRecordSchema.virtual('bloodPressureCategory').get(function bpCategory() {
  if (!this.systolic || !this.diastolic) return null;
  if (this.systolic >= 140 || this.diastolic >= 90) return 'high';
  if (this.systolic >= 120 || this.diastolic >= 80) return 'elevated';
  return 'normal';
});

healthRecordSchema.pre('validate', function checkVaccination(next) {
  if (this.recordType === 'vaccination' && !this.vaccineName) {
    this.invalidate('vaccineName', 'Vaccine name is required for vaccination records');
  }
  if (this.nextDueDate && this.visitDate && this.nextDueDate <= this.visitDate) {
    this.invalidate('nextDueDate', 'Next due date must be after the visit date');
  }
  next();
});

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
