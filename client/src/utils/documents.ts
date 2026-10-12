import type { DocumentRequest } from '../types';

export const canDownloadDocument = (r: Pick<DocumentRequest, 'status' | 'paymentStatus'>) =>
  ['ready', 'released'].includes(r.status) && r.paymentStatus !== 'unpaid';
