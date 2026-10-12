import { z } from 'zod';
import { notFuture, optionalIsoDate, optionalNumber } from './common';

export const RECORD_TYPES = ['checkup', 'vaccination', 'prenatal', 'senior_monitoring'] as const;

export const healthSchema = z
  .object({
    resident: z.string().min(1, 'Choose a resident'),
    recordType: z.enum(RECORD_TYPES),
    visitDate: notFuture('Visit date'),
    weightKg: optionalNumber(1, 300, 'Weight'),
    heightCm: optionalNumber(30, 250, 'Height'),
    systolic: optionalNumber(50, 260, 'Systolic'),
    diastolic: optionalNumber(30, 160, 'Diastolic'),
    vaccineName: z.string().trim().max(80),
    doseNumber: optionalNumber(1, 10, 'Dose'),
    nextDueDate: optionalIsoDate,
    notes: z.string().trim().max(1000),
  })
  .superRefine((v, ctx) => {
    if (v.recordType === 'vaccination' && !v.vaccineName) ctx.addIssue({ code: 'custom', path: ['vaccineName'], message: 'Vaccine name is required' });
    if (v.nextDueDate && v.nextDueDate <= v.visitDate) ctx.addIssue({ code: 'custom', path: ['nextDueDate'], message: 'Must be after the visit date' });
    if ((v.systolic && !v.diastolic) || (!v.systolic && v.diastolic)) ctx.addIssue({ code: 'custom', path: ['diastolic'], message: 'Enter both blood pressure numbers' });
  });
export type HealthFormValues = z.infer<typeof healthSchema>;
