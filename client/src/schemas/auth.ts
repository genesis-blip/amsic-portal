import { z } from 'zod';
import { residentSchema } from './resident';

const password = z.string().min(8, 'Use at least 8 characters').regex(/[A-Za-z]/, 'Include at least one letter').regex(/\d/, 'Include at least one number');
const username = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{4,30}$/, 'Use 4 to 30 letters, numbers, dots, dashes or underscores');

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username or email'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const otpSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from the text message') });
export type OtpValues = z.infer<typeof otpSchema>;

export const forgotSchema = z.object({ username: z.string().trim().min(1, 'Enter your username or email') });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from the text message'),
  newPassword: password,
  confirmPassword: z.string(),
}).refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
export type ResetValues = z.infer<typeof resetSchema>;

export const registerSchema = residentSchema
  .pick({ firstName: true, middleName: true, lastName: true, suffix: true, birthdate: true, sex: true, civilStatus: true, purok: true, address: true, contactNumber: true, email: true })
  .extend({
    contactNumber: z.string().trim().regex(/^09\d{9}$/, 'Use 11 digits starting with 09'),
    username,
    password,
    confirmPassword: z.string(),
    agree: z.literal(true, { errorMap: () => ({ message: 'Confirm that you live in Barangay Amsic' }) }),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
export type RegisterValues = z.infer<typeof registerSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: password,
  confirmPassword: z.string(),
})
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Choose a password different from the current one' });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const STAFF_ROLES = ['super_admin', 'captain', 'secretary', 'treasurer', 'health_worker', 'tanod'] as const;
export const ROLE_LABELS: Record<(typeof STAFF_ROLES)[number], string> = {
  super_admin: 'Super admin', captain: 'Barangay captain', secretary: 'Secretary', treasurer: 'Treasurer', health_worker: 'Health worker', tanod: 'Tanod',
};

export const staffAccountSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  username,
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
  mobile: z.string().trim().regex(/^(09\d{9})?$/, 'Use 11 digits starting with 09'),
  role: z.enum(STAFF_ROLES, { errorMap: () => ({ message: 'Choose a role' }) }),
});
export type StaffAccountValues = z.infer<typeof staffAccountSchema>;

export const profileSchema = residentSchema.pick({ contactNumber: true, email: true, address: true, purok: true, civilStatus: true, occupation: true });
export type ProfileValues = z.infer<typeof profileSchema>;

export const mobileSchema = z.object({ mobile: z.string().trim().regex(/^(09\d{9})?$/, 'Use 11 digits starting with 09') });
export type MobileValues = z.infer<typeof mobileSchema>;
