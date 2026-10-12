import { z } from 'zod';

const today = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

export const isoDate = (label: string) => z.string().min(1, `${label} is required`).regex(/^\d{4}-\d{2}-\d{2}$/, `Enter a valid ${label.toLowerCase()}`);

export const optionalIsoDate = z.preprocess((v) => (v === '' || v == null ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

export const notFuture = (label: string) => isoDate(label).refine((v) => v <= today(), `${label} cannot be in the future`);

export const optionalNumber = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (v === '' || v == null || Number.isNaN(v) ? undefined : Number(v)),
    z.number({ invalid_type_error: `${label} must be a number` }).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`).optional(),
  );

export const requiredText = (label: string, min = 1, max = 200) =>
  z.string().trim().min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`).max(max, `${label} must be at most ${max} characters`);
