import { z } from 'zod';
import { notFuture, requiredText } from './common';

export const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6', 'Purok 7'] as const;

export const residentSchema = z.object({
  firstName: requiredText('First name', 1, 60),
  middleName: z.string().trim().max(60),
  lastName: requiredText('Last name', 1, 60),
  suffix: z.string().trim().max(10),
  birthdate: notFuture('Birthdate'),
  sex: z.enum(['male', 'female'], { errorMap: () => ({ message: 'Choose sex' }) }),
  civilStatus: z.enum(['single', 'married', 'widowed', 'separated']),
  purok: z.enum(PUROKS, { errorMap: () => ({ message: 'Choose a purok' }) }),
  address: requiredText('Address', 5, 200),
  contactNumber: z.string().trim().regex(/^(09\d{9})?$/, 'Use 11 digits starting with 09'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
  occupation: z.string().trim().max(80),
  isVoter: z.boolean(),
  residencyType: z.enum(['non_migrant', 'migrant', 'transient']),
  yearsOfResidency: z.coerce.number({ invalid_type_error: 'Enter a number' }).int('Whole years only').min(0, 'Cannot be negative').max(120, 'Too many years'),
});

export type ResidentFormValues = z.infer<typeof residentSchema>;

export const emptyResident: ResidentFormValues = {
  firstName: '', middleName: '', lastName: '', suffix: '', birthdate: '', sex: 'female', civilStatus: 'single',
  purok: 'Purok 1', address: '', contactNumber: '', email: '', occupation: '', isVoter: false, residencyType: 'non_migrant', yearsOfResidency: 0,
};
