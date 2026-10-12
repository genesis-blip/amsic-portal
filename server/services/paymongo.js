const ApiError = require('../utils/ApiError');

const API = process.env.PAYMONGO_API_URL || 'https://api.paymongo.com/v1';
const MIN_CENTAVOS = 2000;
const QR_LIFETIME_MS = 30 * 60 * 1000;

const isEnabled = () => /^sk_(test|live)_/.test(process.env.PAYMONGO_SECRET_KEY || '');
const isTestKey = () => /^sk_test_/.test(process.env.PAYMONGO_SECRET_KEY || '');

async function call(method, path, attributes) {
  if (!isEnabled()) throw new ApiError(503, 'Online payment is not set up. Please pay at the barangay hall.');
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'BarangayAmsicPortal/2.0',
      },
      body: attributes ? JSON.stringify({ data: { attributes } }) : undefined,
    });
  } catch (err) {
    console.error('[paymongo] could not reach PayMongo:', err.message);
    throw new ApiError(502, 'Could not reach PayMongo. Check the internet connection and try again.');
  }
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = {}; }
  if (!res.ok) {
    const e = json.errors?.[0];
    console.error(`[paymongo] ${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 400)}`);
    throw new ApiError(502, `PayMongo: ${e?.detail || e?.code || res.statusText || 'request failed'}`);
  }
  return json.data;
}

async function createQrPh({ amountPesos, description, billing = {}, metadata = {} }) {
  const amount = Math.round(Number(amountPesos) * 100);
  if (!Number.isFinite(amount) || amount < MIN_CENTAVOS) {
    throw ApiError.badRequest('Online payment needs at least ₱20.00. Please pay at the barangay hall.');
  }
  const intent = await call('POST', '/payment_intents', {
    amount,
    currency: 'PHP',
    payment_method_allowed: ['qrph'],
    capture_type: 'automatic',
    description: String(description).slice(0, 255),
    statement_descriptor: 'BRGY AMSIC',
    metadata,
  });
  const cleanBilling = {};
  if (billing.name) cleanBilling.name = String(billing.name).slice(0, 100);
  if (billing.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.email)) cleanBilling.email = billing.email;
  if (billing.phone) cleanBilling.phone = String(billing.phone).slice(0, 20);
  const pm = await call('POST', '/payment_methods', { type: 'qrph', ...(Object.keys(cleanBilling).length ? { billing: cleanBilling } : {}) });
  const attached = await call('POST', `/payment_intents/${intent.id}/attach`, { payment_method: pm.id });
  const qrImage = attached?.attributes?.next_action?.code?.image_url;
  if (!qrImage) throw new ApiError(502, 'PayMongo did not return a QR code. Please try again.');
  return { paymentIntentId: intent.id, qrImage, expiresAt: new Date(Date.now() + QR_LIFETIME_MS) };
}

async function getIntent(paymentIntentId) {
  const intent = await call('GET', `/payment_intents/${encodeURIComponent(paymentIntentId)}`);
  const a = intent?.attributes || {};
  const payments = Array.isArray(a.payments) ? a.payments : [];
  const paid = payments.find((p) => p.attributes?.status === 'paid') || payments[0];
  return { status: a.status, paymentId: paid ? paid.id : null };
}

module.exports = { isEnabled, isTestKey, createQrPh, getIntent };
