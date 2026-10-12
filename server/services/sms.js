const API_URL = process.env.SEMAPHORE_API_URL || 'https://api.semaphore.co/api/v4/messages';

const isEnabled = () => !!process.env.SEMAPHORE_API_KEY;

function toLocalMobile(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('63') && d.length === 12) d = `0${d.slice(2)}`;
  if (d.startsWith('9') && d.length === 10) d = `0${d}`;
  return /^09\d{9}$/.test(d) && !d.startsWith('0900') ? d : null;
}

const maskMobile = (n) => `${n.slice(0, 4)}•••${n.slice(-4)}`;

async function sendSms(to, message) {
  const number = toLocalMobile(to);
  if (!isEnabled() || !number) return false;
  try {
    const body = new URLSearchParams({ apikey: process.env.SEMAPHORE_API_KEY, number, message: message.slice(0, 300) });
    if (process.env.SEMAPHORE_SENDER_NAME) body.set('sendername', process.env.SEMAPHORE_SENDER_NAME);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(data) || data.length === 0) {
      console.error('[sms] Semaphore refused the message:', res.status, JSON.stringify(data).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[sms] could not reach Semaphore:', err.message);
    return false;
  }
}

const sendLoginCode = (to, code) =>
  sendSms(to, `Barangay Amsic Portal: Your log in code is ${code}. It expires in 5 minutes. Do not share this code with anyone.`);

const sendResetCode = (to, code) =>
  sendSms(to, `Barangay Amsic Portal: Your password reset code is ${code}. It expires in 10 minutes. If you did not ask for this, ignore this message.`);

const STATUS_LINE = {
  processing: 'is now being processed',
  ready: 'is READY for pickup. Bring a valid ID',
  released: 'has been released. Thank you',
  rejected: 'was not approved. Check the portal for the reason',
  cancelled: 'has been cancelled',
};

function sendRequestStatus(to, referenceNumber, documentName, status) {
  const line = STATUS_LINE[status];
  if (!line) return Promise.resolve(false);
  return sendSms(to, `Barangay Amsic: Your ${documentName} (${referenceNumber}) ${line}.`);
}

module.exports = { isEnabled, toLocalMobile, maskMobile, sendSms, sendLoginCode, sendResetCode, sendRequestStatus };
