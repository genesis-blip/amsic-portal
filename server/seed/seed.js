require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

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
const { computeFees } = require('../services/feeService');
const { addHolidays } = require('./add-holidays');
const { toIsoDay, dayStart, addDays, weekday } = require('../services/dates');

let state = 20261012;
const rand = () => { state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648; };
const pickOne = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const notFuture = (d) => new Date(Math.min(d.getTime(), NOW - 60 * 1000));
const TODAY = toIsoDay();
const daysAgo = (n, hour = 9) => new Date(dayStart(addDays(TODAY, -n)).getTime() + (hour - 8) * 60 * 60 * 1000);
const year = new Date().getFullYear();
const num = (prefix, n, pad = 5) => `${prefix}-${year}-${String(n).padStart(pad, '0')}`;

function weekdayFrom(offset) {
  let iso = addDays(TODAY, offset);
  while ([0, 6].includes(weekday(iso))) iso = addDays(iso, 1);
  return iso;
}

const FIRST_M = ['Juan', 'Jose', 'Mark', 'Paolo', 'Rafael', 'Carlo', 'Miguel', 'Andres', 'Ramon', 'Ernesto', 'Daniel', 'Joshua', 'Renato', 'Arnel'];
const FIRST_F = ['Maria', 'Ana', 'Kristine', 'Angelica', 'Shaine', 'Liza', 'Camille', 'Rosario', 'Teresita', 'Jasmine', 'Patricia', 'Erlinda', 'Bea', 'Nicole'];
const LAST = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Bautista', 'Manalo', 'David', 'Lacson', 'Pineda', 'Dizon', 'Yabut', 'Gomez', 'Tolentino', 'Navarro', 'Sison'];
const MIDDLE = ['Cruz', 'Lopez', 'Torres', 'Ramos', 'Castro', 'Flores', 'Aquino', ''];
const STREETS = ['Rizal St.', 'Mabini St.', 'Sampaguita St.', 'Narra St.', 'Acacia St.', 'Del Pilar St.', 'Bonifacio St.'];
const JOBS = ['Teacher', 'Driver', 'Vendor', 'Nurse', 'Student', 'Farmer', 'Call center agent', 'Retired', 'Housewife', 'Construction worker', 'Barangay health worker', 'Self-employed'];

async function run() {
  await connectDB();
  console.log('Clearing collections...');
  await Promise.all([Resident, DocumentType, DocumentRequest, Payment, Incident, BlotterRecord, SosAlert, Bulletin, HealthRecord, ScheduleBlock, Counter, User]
    .map((M) => M.deleteMany({})));

  const typeData = [
    ['clearance', 'Barangay Clearance', 40, 1, ['Valid ID', 'Cedula']],
    ['residency', 'Certificate of Residency', 40, 1, ['Valid ID', 'Proof of address']],
    ['indigency', 'Certificate of Indigency', 0, 1, ['Valid ID']],
    ['cedula', 'Cedula (Community Tax Certificate)', 40, 0, ['Valid ID']],
    ['goodmoral', 'Certificate of Good Moral Character', 40, 2, ['Valid ID', 'Barangay Clearance']],
    ['business', 'Business Permit', 40, 3, ['DTI registration', 'Valid ID', 'Lease contract']],
    ['building', 'Building Permit Endorsement', 40, 3, ['Building plan', 'Valid ID']],
    ['soloparent', 'Certificate of Solo Parent', 40, 2, ['Valid ID', 'Birth certificate of child']],
    ['barangayid', 'Barangay ID', 40, 2, ['1x1 photo', 'Valid ID']],
    ['cohabitation', 'Certificate of Cohabitation', 40, 2, ['Valid IDs of both partners']],
    ['guardianship', 'Certificate of Guardianship', 40, 2, ['Valid ID', 'Birth certificate']],
    ['voter', 'Certificate of Voter Registration', 40, 1, ['Valid ID']],
  ];
  const types = await DocumentType.insertMany(typeData.map(([code, name, fee, processingDays, requirements]) => ({
    code, name, fee, processingDays, requirements, description: `Issued by Barangay Amsic for official use. Processing: ${processingDays || 'same'} day(s).`,
  })));
  await DocumentType.create({ code: 'firearms', name: 'Firearms Clearance Endorsement', fee: 100, processingDays: 5, isActive: false, description: 'Temporarily not issued.' });
  console.log(`  ${types.length + 1} document types`);

  const residents = [];
  for (let i = 0; i < 40; i += 1) {
    const sex = i % 2 === 0 ? 'male' : 'female';
    const age = i < 6 ? between(60, 84) : i < 10 ? between(8, 17) : between(18, 59);
    const birth = new Date(Date.UTC(year - age, between(0, 11), between(1, 28)));
    residents.push({
      residentNo: num('AMS', i + 1),
      firstName: pickOne(sex === 'male' ? FIRST_M : FIRST_F),
      middleName: pickOne(MIDDLE),
      lastName: pickOne(LAST),
      birthdate: birth,
      sex,
      civilStatus: age < 22 ? 'single' : age >= 70 ? pickOne(['married', 'widowed']) : pickOne(['single', 'married', 'married', 'separated']),
      purok: `Purok ${(i % 7) + 1}`,
      address: `${between(1, 250)} ${pickOne(STREETS)}, Purok ${(i % 7) + 1}, Barangay Amsic, Angeles City`,
      contactNumber: age >= 13 ? `0900${between(1000000, 9999999)}` : undefined,
      email: age >= 18 && rand() > 0.4 ? `resident${i + 1}@example.com` : '',
      occupation: age < 18 ? 'Student' : age >= 65 ? 'Retired' : pickOne(JOBS),
      isVoter: age >= 18 && rand() > 0.25,
      residencyType: pickOne(['non_migrant', 'non_migrant', 'non_migrant', 'migrant', 'transient']),
      yearsOfResidency: Math.min(age, between(1, 40)),
      createdAt: daysAgo(between(150, 200)),
    });
  }
  const res = await Resident.insertMany(residents);
  await Counter.create({ key: `AMS-${year}`, value: res.length });
  console.log(`  ${res.length} residents`);
  const adults = res.filter((r) => r.age >= 18);

  const SLOTS = DocumentRequest.SLOTS;
  const requests = [];
  const payments = [];
  let reqNo = 0;
  let orNo = 0;
  const slotUse = {};
  const typesActive = types;

  function makeRequest({ resident, type, createdDaysAgo, pickupIso, status, paid }) {
    reqNo += 1;
    const copies = rand() > 0.8 ? 2 : 1;
    const fees = computeFees(type, copies, resident.birthdate);
    const createdAt = notFuture(daysAgo(createdDaysAgo, between(8, 16)));
    const history = [{ status: 'pending', note: 'Request submitted', changedAt: createdAt }];
    const flow = { processing: ['processing'], ready: ['processing', 'ready'], released: ['processing', 'ready', 'released'], cancelled: ['cancelled'], rejected: ['rejected'], pending: [] }[status];
    flow.forEach((s, idx) => history.push({ status: s, note: s === 'rejected' ? 'Incomplete requirements' : '', changedAt: notFuture(new Date(createdAt.getTime() + (idx + 1) * 0.8 * DAY)) }));
    const paymentStatus = fees.total === 0 ? 'waived' : paid ? 'paid' : 'unpaid';
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      referenceNumber: num('BRG', reqNo),
      resident: resident._id,
      documentType: type._id,
      purpose: pickOne(['Employment', 'School requirement', 'Bank account opening', 'Scholarship application', 'Medical assistance', 'Business registration', 'Travel requirement', 'Loan application']),
      copies,
      pickupDate: dayStart(pickupIso),
      pickupSlot: pickOne(SLOTS),
      fees: { unitFee: fees.unitFee, subtotal: fees.subtotal, discountRate: fees.discountRate, discount: fees.discount, total: fees.total },
      isSenior: fees.isSenior,
      status,
      paymentStatus,
      statusHistory: history,
      releasedAt: status === 'released' ? history[history.length - 1].changedAt : undefined,
      createdAt,
      updatedAt: history[history.length - 1].changedAt,
    };
    if (['pending', 'processing', 'ready'].includes(status)) {
      const key = `${pickupIso}|${doc.pickupSlot}`;
      slotUse[key] = (slotUse[key] || 0) + 1;
      if (slotUse[key] > 3) {
        doc.pickupSlot = SLOTS.find((s) => (slotUse[`${pickupIso}|${s}`] || 0) < 3) || SLOTS[0];
        slotUse[`${pickupIso}|${doc.pickupSlot}`] = (slotUse[`${pickupIso}|${doc.pickupSlot}`] || 0) + 1;
      }
    }
    requests.push(doc);
    if (paymentStatus === 'paid') {
      orNo += 1;
      payments.push({
        orNumber: num('OR', orNo),
        request: doc._id,
        resident: resident._id,
        payerName: `${resident.firstName} ${resident.lastName}`,
        amount: fees.total,
        method: pickOne(['cash', 'cash', 'cash', 'gcash', 'maya']),
        category: 'document_fee',
        description: `Payment for ${doc.referenceNumber}`,
        paidAt: notFuture(new Date(createdAt.getTime() + 0.1 * DAY)),
        createdAt: notFuture(new Date(createdAt.getTime() + 0.1 * DAY)),
      });
    }
  }

  for (let i = 0; i < 34; i += 1) {
    const created = between(8, 175);
    const status = rand() > 0.12 ? 'released' : pickOne(['cancelled', 'rejected']);
    makeRequest({ resident: pickOne(adults), type: pickOne(typesActive), createdDaysAgo: created, pickupIso: addDays(TODAY, -created + 2), status, paid: status === 'released' });
  }
  makeRequest({ resident: adults[3], type: types[0], createdDaysAgo: 20, pickupIso: weekdayFrom(-14), status: 'ready', paid: true });
  makeRequest({ resident: adults[8], type: types[1], createdDaysAgo: 16, pickupIso: weekdayFrom(-10), status: 'ready', paid: false });
  makeRequest({ resident: adults[12], type: types[4], createdDaysAgo: 6, pickupIso: weekdayFrom(-3), status: 'processing', paid: false });
  const upcoming = [
    ['pending', 1, false], ['pending', 1, false], ['pending', 2, false], ['processing', 2, true], ['processing', 3, false],
    ['ready', 1, true], ['ready', 2, true], ['pending', 4, false], ['pending', 5, false], ['processing', 6, true],
    ['pending', 7, false], ['ready', 3, false],
  ];
  upcoming.forEach(([status, offset, paid], i) => {
    makeRequest({ resident: adults[(i * 3) % adults.length], type: types[i % types.length], createdDaysAgo: between(0, 3), pickupIso: weekdayFrom(offset), status, paid });
  });
  const fullDay = weekdayFrom(8);
  SLOTS.forEach((slot) => {
    for (let k = 0; k < 3; k += 1) {
      makeRequest({ resident: pickOne(adults), type: types[0], createdDaysAgo: 1, pickupIso: fullDay, status: 'pending', paid: false });
      requests[requests.length - 1].pickupSlot = slot;
    }
  });

  await DocumentRequest.insertMany(requests);
  [['Sari-sari store renewal', 'business_fee', 300], ['Curfew violation fine', 'fine', 200], ['Donation for basketball court', 'donation', 1000]].forEach(([desc, category, amount], i) => {
    orNo += 1;
    payments.push({ orNumber: num('OR', orNo), payerName: `${adults[20 + i].firstName} ${adults[20 + i].lastName}`, resident: adults[20 + i]._id, amount, method: 'cash', category, description: desc, paidAt: daysAgo(between(2, 40), 10) });
  });
  orNo += 1;
  payments.push({ orNumber: num('OR', orNo), payerName: `${adults[25].firstName} ${adults[25].lastName}`, amount: 150, method: 'gcash', category: 'other', description: 'Hall reservation', paidAt: daysAgo(12, 14), isVoided: true, voidReason: 'Duplicate entry', voidedAt: daysAgo(12, 15) });
  await Payment.insertMany(payments);
  await Counter.create([{ key: `BRG-${year}`, value: reqNo }, { key: `OR-${year}`, value: orNo }]);
  console.log(`  ${requests.length} document requests, ${payments.length} payments`);

  const incidentSeed = [
    ['noise', 'Videoke past 10 PM every night near the basketball court', 'Purok 3 covered court', 'medium', 'open', 6],
    ['stray_animal', 'Group of stray dogs chasing children on the way to school', 'Sampaguita St., Purok 2', 'high', 'under_review', 3],
    ['theft', 'Motorcycle side mirror stolen while parked overnight', 'Narra St., Purok 5', 'medium', 'resolved', 25],
    ['flood', 'Clogged canal causing knee-deep flooding after heavy rain', 'Mabini St., Purok 1', 'critical', 'open', 1],
    ['vandalism', 'Graffiti on the barangay waiting shed', 'Rizal St. waiting shed', 'low', 'dismissed', 40],
    ['dispute', 'Neighbors arguing over a shared fence line', 'Acacia St., Purok 6', 'medium', 'under_review', 9],
    ['accident', 'Tricycle and bicycle collision, minor injuries', 'Del Pilar St. corner Bonifacio', 'high', 'resolved', 14],
    ['fire', 'Small grass fire behind the elementary school, put out by residents', 'Behind Amsic Elementary School', 'high', 'resolved', 60],
  ];
  await Incident.insertMany(incidentSeed.map(([type, description, location, urgency, status, ago], i) => {
    const reporter = adults[i * 2];
    const closed = ['resolved', 'dismissed'].includes(status);
    return {
      reporter: reporter._id, reporterName: `${reporter.firstName} ${reporter.lastName}`, type, description, location, urgency, status,
      occurredAt: daysAgo(ago + 1, 20), createdAt: daysAgo(ago, 8), updatedAt: daysAgo(closed ? ago - 2 : ago, 9),
      resolvedAt: closed ? daysAgo(Math.max(ago - 2, 0), 15) : undefined,
      resolutionNotes: closed ? (status === 'dismissed' ? 'Could not identify the responsible party' : 'Settled and area inspected by tanod') : '',
    };
  }));
  console.log(`  ${incidentSeed.length} incidents`);

  const blotterSeed = [
    ['Unpaid debt of ₱5,000', 'Respondent borrowed money in March and refuses to pay despite several reminders.', 'for_hearing', 5],
    ['Physical altercation', 'Complainant was pushed during an argument at the sari-sari store.', 'mediation', 12],
    ['Boundary dispute', 'Respondent built a fence 1 meter inside the complainant\'s lot.', 'filed', 2],
    ['Verbal threats', 'Respondent shouted threats at the complainant\'s family after a parking issue.', 'settled', 30],
    ['Damage to property', 'Respondent\'s goat destroyed the complainant\'s vegetable garden.', 'filed', 20],
  ];
  await BlotterRecord.insertMany(blotterSeed.map(([nature, details, status, ago], i) => {
    const comp = adults[i + 5];
    const created = daysAgo(ago, 10);
    const actions = [{ action: 'Complaint filed', note: nature, date: created }];
    if (['for_hearing', 'mediation', 'settled'].includes(status)) actions.push({ action: `Hearing set for ${weekdayFrom(4)}`, note: 'Both parties notified', date: new Date(created.getTime() + DAY) });
    if (['mediation', 'settled'].includes(status)) actions.push({ action: 'Moved to mediation', note: 'Lupon assigned', date: new Date(created.getTime() + 4 * DAY) });
    if (status === 'settled') actions.push({ action: 'Case settled', note: 'Amicable settlement signed', date: new Date(created.getTime() + 9 * DAY) });
    return {
      caseNumber: num('BLT', i + 1, 4), complainant: comp._id, complainantName: `${comp.firstName} ${comp.lastName}`,
      respondentName: `${pickOne(FIRST_M)} ${pickOne(LAST)}`, nature, details, incidentDate: daysAgo(ago + 2), status,
      hearingDate: status === 'for_hearing' ? dayStart(weekdayFrom(4)) : undefined,
      closedAt: status === 'settled' ? new Date(created.getTime() + 9 * DAY) : undefined,
      actions, createdAt: created, updatedAt: actions[actions.length - 1].date,
    };
  }));
  await Counter.create({ key: `BLT-${year}`, value: blotterSeed.length });
  console.log(`  ${blotterSeed.length} blotter records`);

  const now = Date.now();
  const sosSeed = [
    ['medical', 'Lolo collapsed, not responding', 'resolved', 3 * DAY, 4, 38],
    ['fire', 'Smoke coming from the neighbor\'s kitchen', 'resolved', 9 * DAY, 2, 25],
    ['crime', 'Someone is trying to open our gate', 'resolved', 15 * DAY, 7, 45],
    ['flood', 'Water entering the house, need help with elderly', 'acknowledged', 2 * 60 * 60 * 1000, 6, null],
    ['medical', 'Pregnant wife having contractions, no vehicle', 'active', 12 * 60 * 1000, null, null],
  ];
  await SosAlert.insertMany(sosSeed.map(([emergencyType, message, status, agoMs, ackMin, resMin], i) => {
    const r = res[i + 2];
    const createdAt = new Date(now - agoMs);
    return {
      resident: r._id, emergencyType, message, location: r.address, status, createdAt, updatedAt: createdAt,
      latitude: 15.1450 + i * 0.001, longitude: 120.5887 + i * 0.001,
      acknowledgedAt: ackMin ? new Date(createdAt.getTime() + ackMin * 60000) : undefined,
      resolvedAt: resMin ? new Date(createdAt.getTime() + resMin * 60000) : undefined,
    };
  }));
  console.log(`  ${sosSeed.length} SOS alerts`);

  await Bulletin.insertMany([
    { title: 'Free anti-rabies vaccination', content: 'Bring your dogs and cats to the covered court this Saturday, 8 AM to 12 NN. Free for all registered residents.', category: 'health', eventDate: dayStart(addDays(TODAY, 3)), expiresAt: dayStart(addDays(TODAY, 4)), isPinned: true, createdAt: daysAgo(2) },
    { title: 'Barangay Assembly — 4th Quarter', content: 'All residents are invited to the quarterly barangay assembly at the multi-purpose hall. Agenda: budget report, peace and order, and drainage project.', category: 'event', eventDate: dayStart(addDays(TODAY, 10)), expiresAt: dayStart(addDays(TODAY, 11)), createdAt: daysAgo(5) },
    { title: 'Typhoon preparedness advisory', content: 'Secure loose roofing, prepare a go-bag, and keep your phones charged. Evacuation center: Amsic Elementary School.', category: 'emergency', isPinned: true, createdAt: daysAgo(1) },
    { title: 'New office hours for document pickup', content: 'Document pickups are now scheduled in four slots: 8–9 AM, 9–10 AM, 1–2 PM and 2–3 PM, Monday to Friday. Book your slot when you request online.', category: 'announcement', createdAt: daysAgo(20) },
    { title: 'Clean-up drive', content: 'Join the Purok 1 to 3 clean-up drive. Gloves and sacks will be provided.', category: 'event', eventDate: dayStart(addDays(TODAY, -6)), expiresAt: dayStart(addDays(TODAY, -5)), createdAt: daysAgo(15) },
    { title: 'Water interruption advisory', content: 'Water service will be interrupted from 9 AM to 3 PM due to pipe repairs along Rizal St.', category: 'advisory', expiresAt: dayStart(addDays(TODAY, 2)), createdAt: daysAgo(1) },
  ]);
  console.log('  6 bulletins');

  const health = [];
  res.slice(0, 6).forEach((senior, i) => {
    health.push({ resident: senior._id, recordType: 'senior_monitoring', visitDate: daysAgo(40 + i), weightKg: between(48, 80), heightCm: between(148, 172), systolic: between(118, 158), diastolic: between(72, 98), nextDueDate: dayStart(addDays(TODAY, -10 + i * 6)), notes: 'Monthly BP monitoring' });
  });
  res.slice(6, 10).forEach((kid, i) => {
    health.push({ resident: kid._id, recordType: 'vaccination', visitDate: daysAgo(30 + i * 10), vaccineName: pickOne(['MMR', 'HPV', 'Tetanus-diphtheria']), doseNumber: 1, nextDueDate: dayStart(addDays(TODAY, -5 + i * 12)), notes: 'School-based immunization' });
  });
  adults.slice(10, 18).forEach((a, i) => {
    health.push({ resident: a._id, recordType: 'checkup', visitDate: daysAgo(5 + i * 7), weightKg: between(50, 95), heightCm: between(150, 180), systolic: between(105, 145), diastolic: between(68, 95), notes: 'General check-up' });
  });
  health.push({ resident: adults.find((a) => a.sex === 'female')._id, recordType: 'prenatal', visitDate: daysAgo(14), weightKg: 61, heightCm: 158, systolic: 112, diastolic: 74, nextDueDate: dayStart(addDays(TODAY, 14)), notes: 'Second trimester check-up' });
  await HealthRecord.insertMany(health);
  console.log(`  ${health.length} health records`);

  const blocks = [];
  const yy = Number(TODAY.slice(0, 4));
  [[`${yy}-11-01`, "All Saints' Day"], [`${yy}-11-30`, 'Bonifacio Day'], [`${yy}-12-08`, 'Feast of the Immaculate Conception'], [`${yy}-12-25`, 'Christmas Day'], [weekdayFrom(12), 'Barangay Foundation Day']]
    .forEach(([d, reason]) => { if (d > TODAY) blocks.push({ date: dayStart(d), reason }); });
  await ScheduleBlock.insertMany(blocks);
  console.log(`  ${blocks.length} blocked dates`);
  await addHolidays({ log: (m) => console.log(`  ${m}`) });

  const DEMO_PASSWORD = 'Amsic2026!';
  const staff = [
    ['admin', 'super_admin', 'Ramon', 'Bautista'],
    ['captain', 'captain', 'Eduardo', 'Manalo'],
    ['secretary', 'secretary', 'Liza', 'Dizon'],
    ['treasurer', 'treasurer', 'Carmela', 'Pineda'],
    ['health', 'health_worker', 'Josefina', 'Tolentino'],
    ['tanod', 'tanod', 'Rodel', 'Garcia'],
  ];
  const requestCount = {};
  requests.forEach((r) => { requestCount[r.resident] = (requestCount[r.resident] || 0) + 1; });
  const demoResident = [...adults].sort((a, b) => (requestCount[b._id] || 0) - (requestCount[a._id] || 0))[0];
  const accounts = [
    ...staff.map(([username, role, firstName, lastName]) => new User({ username, role, firstName, lastName, accountType: 'staff', email: `${username}@amsic.gov.ph` })),
    new User({ username: 'resident', accountType: 'resident', resident: demoResident._id, email: demoResident.email }),
  ];
  for (const u of accounts) await u.setPassword(DEMO_PASSWORD);
  await User.insertMany(accounts);
  console.log(`  ${accounts.length} accounts (password for all: ${DEMO_PASSWORD})`);
  console.log(`    staff: ${staff.map((s) => s[0]).join(', ')}`);
  console.log(`    resident: resident (${demoResident.firstName} ${demoResident.lastName})`);

  console.log('\nSeed complete.');
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
