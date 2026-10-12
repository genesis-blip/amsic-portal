const crypto = require('crypto');

function hashSettings() {
  const { FIREBASE_HASH_KEY, FIREBASE_HASH_SALT_SEPARATOR, FIREBASE_HASH_ROUNDS, FIREBASE_HASH_MEM_COST } = process.env;
  if (!FIREBASE_HASH_KEY) return null;
  return {
    signerKey: Buffer.from(FIREBASE_HASH_KEY, 'base64'),
    saltSeparator: Buffer.from(FIREBASE_HASH_SALT_SEPARATOR || 'Bw==', 'base64'),
    rounds: Number(FIREBASE_HASH_ROUNDS || 8),
    memCost: Number(FIREBASE_HASH_MEM_COST || 14),
  };
}

function verifyFirebasePassword(password, saltB64, hashB64, settings = hashSettings()) {
  if (!settings || !saltB64 || !hashB64) return false;
  const salt = Buffer.concat([Buffer.from(saltB64, 'base64'), settings.saltSeparator]);
  const N = 2 ** settings.memCost;
  const key = crypto.scryptSync(Buffer.from(password, 'utf8'), salt, 32, {
    N, r: settings.rounds, p: 1, maxmem: 128 * N * settings.rounds * 2,
  });
  const cipher = crypto.createCipheriv('aes-256-ctr', key, Buffer.alloc(16, 0));
  const computed = Buffer.concat([cipher.update(settings.signerKey), cipher.final()]);
  const expected = Buffer.from(hashB64, 'base64');
  return computed.length === expected.length && crypto.timingSafeEqual(computed, expected);
}

module.exports = { verifyFirebasePassword, hashSettings };
