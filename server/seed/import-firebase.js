require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { mapFirebase } = require('./firebaseMapper');
const { addHolidays } = require('./add-holidays');

const Resident = require('../models/Resident');
const DocumentType = require('../models/DocumentType');
const DocumentRequest = require('../models/DocumentRequest');
const Payment = require('../models/Payment');
const Incident = require('../models/Incident');
const BlotterRecord = require('../models/BlotterRecord');
const SosAlert = require('../models/SosAlert');
const Bulletin = require('../models/Bulletin');
const HealthRecord = require('../models/HealthRecord');
const ScheduleBlock = require('../models/ScheduleBlock');
const Counter = require('../models/Counter');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const SOURCE_COLLECTIONS = [
  'users', 'staff_accounts', 'residents', 'document_types', 'document_requests', 'payments', 'incident_reports',
  'blotter_records', 'sos_alerts', 'bulletins_db', 'health_records', 'vaccination_records',
  'pregnancy_records', 'senior_citizen_records',
];

const args = process.argv.slice(2);
const WIPE = args.includes('--wipe');
const jsonIdx = args.indexOf('--from-json');
const FROM_JSON = jsonIdx >= 0 ? args[jsonIdx + 1] : null;
const authIdx = args.indexOf('--auth-export');
const AUTH_EXPORT = authIdx >= 0 ? args[authIdx + 1] : (fs.existsSync(path.join(__dirname, 'auth-users.json')) ? path.join(__dirname, 'auth-users.json') : null);
const keyIdx = args.indexOf('--key');
const KEY_PATH = path.resolve(keyIdx >= 0 ? args[keyIdx + 1] : path.join(__dirname, 'serviceAccountKey.json'));
const FROM_OLD_MONGO = args.includes('--from-old-mongo');

async function readFirestore() {
  if (!fs.existsSync(KEY_PATH)) {
    throw new Error(`serviceAccountKey.json not found at ${KEY_PATH}\n`
      + 'Copy it from the old project (firebase_project/migration/serviceAccountKey.json) into server/seed/.');
  }
  let admin;
  try { admin = require('firebase-admin'); } catch {
    throw new Error('firebase-admin is not installed. Run: npm install');
  }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'))) });
  const db = admin.firestore();

  const convert = (v) => {
    if (v === null || v === undefined) return v;
    if (v instanceof admin.firestore.Timestamp) return v.toDate();
    if (v instanceof admin.firestore.GeoPoint) return { latitude: v.latitude, longitude: v.longitude };
    if (v instanceof admin.firestore.DocumentReference) return v.id;
    if (v instanceof Date || Buffer.isBuffer(v)) return v;
    if (Array.isArray(v)) return v.map(convert);
    if (typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, convert(x)]));
    return v;
  };

  const src = {};
  for (const name of SOURCE_COLLECTIONS) {
    process.stdout.write(`  reading ${name.padEnd(24)}`);
    const snap = await db.collection(name).get();
    src[name] = snap.docs.map((d) => ({ id: d.id, data: convert(d.data()) }));
    if (name === 'blotter_records') {
      for (let i = 0; i < snap.docs.length; i += 1) {
        const acts = await snap.docs[i].ref.collection('actions').get();
        src[name][i].actions = acts.docs.map((a) => ({ id: a.id, data: convert(a.data()) }));
      }
    }
    console.log(src[name].length);
  }
  return src;
}

async function readOldMongo() {
  const uri = process.env.OLD_MONGO_URI;
  if (!uri) throw new Error('Set OLD_MONGO_URI in .env (the database the old Firebase backend used, e.g. .../amsic_portal).');
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;
  const src = {};
  for (const name of SOURCE_COLLECTIONS) {
    const rows = await db.collection(name).find({}).toArray();
    src[name] = rows.map(({ _id, _parent, ...data }) => ({ id: String(_id), data }));
    if (name === 'blotter_records') {
      const acts = await db.collection('blotter_records__actions').find({}).toArray();
      for (const rec of src[name]) {
        rec.actions = acts.filter((a) => a._parent === rec.id).map(({ _id, _parent, ...data }) => ({ id: String(_id), data }));
      }
    }
    console.log(`  read ${name.padEnd(24)}${src[name].length}`);
  }
  await conn.close();
  return src;
}

function readJson(file) {
  const raw = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  for (const name of SOURCE_COLLECTIONS) console.log(`  read ${name.padEnd(24)}${(raw[name] || []).length}`);
  return raw;
}

async function insertAll(Model, docs, label, report) {
  const good = [];
  for (const d of docs) {
    const doc = new Model(d);
    try {
      await doc.validate();
      const obj = doc.toObject({ virtuals: false, versionKey: true, depopulate: true });
      obj.createdAt = d.createdAt || obj.createdAt || new Date();
      obj.updatedAt = d.updatedAt || obj.updatedAt || obj.createdAt;
      if (!Model.schema.path('createdAt')) { delete obj.createdAt; delete obj.updatedAt; }
      good.push(obj);
    } catch (err) {
      const why = err.errors ? Object.values(err.errors).map((e) => e.message).join('; ') : err.message;
      const name = d.referenceNumber || d.orNumber || d.caseNumber || d.title || d.code
        || (d.firstName ? `${d.firstName} ${d.lastName}` : String(d._id));
      report.skipped.push(`${label} ${name}: ${why}`);
    }
  }
  for (let i = 0; i < good.length; i += 500) {
    try {
      await Model.collection.insertMany(good.slice(i, i + 500), { ordered: false });
    } catch (err) {
      for (const we of err.writeErrors || []) {
        const failed = good[i + we.index];
        report.skipped.push(`${label} ${failed.referenceNumber || failed.orNumber || failed.caseNumber || failed._id}: ${we.errmsg || 'duplicate'}`);
      }
      if (!err.writeErrors) throw err;
    }
  }
  const count = await Model.countDocuments();
  console.log(`  ${label.padEnd(16)} ${count}`);
  return count;
}

async function syncCounters() {
  const sources = [
    [DocumentRequest, 'referenceNumber'], [Payment, 'orNumber'], [BlotterRecord, 'caseNumber'], [Resident, 'residentNo'],
  ];
  const max = {};
  for (const [Model, field] of sources) {
    const rows = await Model.find({}, { [field]: 1 }).lean();
    for (const r of rows) {
      const m = String(r[field] || '').match(/^([A-Z]+)-(\d{4})-(\d+)$/);
      if (!m) continue;
      const key = `${m[1]}-${m[2]}`;
      max[key] = Math.max(max[key] || 0, Number(m[3]));
    }
  }
  for (const [key, value] of Object.entries(max)) {
    await Counter.updateOne({ key }, { $max: { value } }, { upsert: true });
  }
  return max;
}

(async () => {
  let src;
  if (FROM_JSON) { console.log(`Reading ${FROM_JSON}...`); src = readJson(FROM_JSON); }
  else if (FROM_OLD_MONGO) { console.log('Reading the old app\'s MongoDB (read-only)...'); src = await readOldMongo(); }
  else { console.log('Reading Firestore (read-only)...'); src = await readFirestore(); }

  await connectDB();
  const models = [Resident, DocumentType, DocumentRequest, Payment, Incident, BlotterRecord, SosAlert, Bulletin, HealthRecord, ScheduleBlock, Counter, User];

  const oldStyle = await mongoose.connection.db.collection('residents').findOne({ _id: { $type: 'string' } });
  if (oldStyle) {
    throw new Error('MONGO_URI points to the OLD app\'s database (it has data copied by firestore-to-mongo.js).\n'
      + 'Nothing was changed. Use a different database name in MONGO_URI, e.g. ...mongodb.net/amsic_mern?...');
  }

  const existing = (await Promise.all(models.slice(0, 9).map((M) => M.estimatedDocumentCount()))).reduce((a, b) => a + b, 0);
  if (existing > 0 && !WIPE) {
    throw new Error(`The database already has ${existing} records (probably from "npm run seed").\n`
      + 'Run again with --wipe to replace them:  npm run import:firebase -- --wipe');
  }
  if (WIPE) {
    console.log('Deleting existing data (--wipe)...');
    for (const M of models) await M.collection.deleteMany({});
  }
  await Promise.all(models.map((M) => M.init()));

  if (AUTH_EXPORT) {
    const exported = JSON.parse(fs.readFileSync(path.resolve(AUTH_EXPORT), 'utf8'));
    src.auth_users = exported.users || [];
    const withHash = src.auth_users.filter((u) => u.passwordHash).length;
    console.log(`  read ${path.basename(AUTH_EXPORT)}: ${src.auth_users.length} login accounts, ${withHash} with a password hash`);
    if (withHash && !process.env.FIREBASE_HASH_KEY) {
      console.log('  NOTE: set FIREBASE_HASH_KEY (and the other hash settings) in .env so old passwords work.');
    }
  } else {
    console.log('  no auth-users.json: accounts get temporary passwords (see temporary-passwords.csv)');
  }

  const mapped = mapFirebase(src);

  const temps = [];
  for (const u of mapped.users) {
    if (u.tempPassword) {
      temps.push(u);
      u.passwordHash = await bcrypt.hash(u.tempPassword, 10);
    }
  }
  const { report } = mapped;

  console.log('\nImported:');
  await insertAll(Resident, mapped.residents, 'residents', report);
  await insertAll(DocumentType, mapped.documentTypes, 'document types', report);
  await insertAll(DocumentRequest, mapped.requests, 'requests', report);
  await insertAll(Payment, mapped.payments, 'payments', report);
  await insertAll(Incident, mapped.incidents, 'incidents', report);
  await insertAll(BlotterRecord, mapped.blotters, 'blotter', report);
  await insertAll(SosAlert, mapped.sosAlerts, 'SOS alerts', report);
  await insertAll(Bulletin, mapped.bulletins, 'bulletins', report);
  await insertAll(HealthRecord, mapped.healthRecords, 'health records', report);
  await insertAll(User, mapped.users.map(({ tempPassword, ...u }) => u), 'accounts', report);

  const tempPath = path.join(__dirname, 'temporary-passwords.csv');
  if (temps.length) {
    fs.writeFileSync(tempPath, ['username,account,role,temporary_password',
      ...temps.map((u) => [u.username, u.accountType, u.role || 'resident', u.tempPassword].join(','))].join('\n'));
  }

  const counters = await syncCounters();
  await addHolidays();
  console.log(`\nCounters set: ${Object.entries(counters).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`);

  const reportPath = path.join(__dirname, 'import-report.txt');
  fs.writeFileSync(reportPath, [
    `Firebase import — ${new Date().toISOString()}`, '',
    `FIXED AUTOMATICALLY (${report.changed.length})`, ...report.changed.map((l) => `  - ${l}`), '',
    `SKIPPED (${report.skipped.length})`, ...report.skipped.map((l) => `  - ${l}`), '',
  ].join('\n'));
  console.log(`${report.changed.length} records fixed automatically, ${report.skipped.length} skipped.`);
  console.log(`Details: ${reportPath}`);
  if (temps.length) {
    console.log(`\n${temps.length} accounts got a TEMPORARY password: ${tempPath}`);
    console.log('Give each person theirs; they must change it on the first log in. Delete the file afterwards.');
  }
  console.log('\nDone. Firebase was not changed.');

  await mongoose.disconnect();
  process.exit(0);
})().catch(async (err) => {
  console.error(`\nImport stopped: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
