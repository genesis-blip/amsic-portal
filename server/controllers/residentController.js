const Resident = require('../models/Resident');
const DocumentRequest = require('../models/DocumentRequest');
const Payment = require('../models/Payment');
const HealthRecord = require('../models/HealthRecord');
const Incident = require('../models/Incident');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { searchFilter, parseSort, parsePaging, paginate } = require('../utils/query');
const { nextNumber } = require('../services/counterService');
const { ageOn } = require('../services/dates');

const EDITABLE = ['firstName', 'middleName', 'lastName', 'suffix', 'birthdate', 'sex', 'civilStatus', 'purok', 'address',
  'contactNumber', 'email', 'occupation', 'isVoter', 'residencyType', 'yearsOfResidency'];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

function birthdateRangeForAge(minAge, maxAge) {
  const now = new Date();
  const range = {};
  if (maxAge !== undefined) {
    const earliest = new Date(now);
    earliest.setUTCFullYear(now.getUTCFullYear() - maxAge - 1);
    range.$gt = earliest;
  }
  if (minAge !== undefined) {
    const latest = new Date(now);
    latest.setUTCFullYear(now.getUTCFullYear() - minAge);
    range.$lte = latest;
  }
  return range;
}
const AGE_GROUPS = { child: [0, 12], youth: [13, 17], adult: [18, 59], senior: [60, undefined] };

exports.listResidents = asyncHandler(async (req, res) => {
  const { search, purok, sex, ageGroup, isVoter, sort } = req.query;
  const filter = { ...searchFilter(search, ['firstName', 'lastName', 'middleName', 'residentNo', 'address', 'contactNumber']) };
  if (purok) filter.purok = purok;
  if (sex) filter.sex = sex;
  if (isVoter === 'true' || isVoter === 'false') filter.isVoter = isVoter === 'true';
  if (ageGroup) {
    if (!AGE_GROUPS[ageGroup]) throw ApiError.badRequest(`ageGroup must be one of: ${Object.keys(AGE_GROUPS).join(', ')}`);
    const [min, max] = AGE_GROUPS[ageGroup];
    filter.birthdate = birthdateRangeForAge(min, max);
  }
  const paging = parsePaging(req.query);
  const result = await paginate(Resident, filter, { ...paging, sort: parseSort(sort, ['lastName', 'firstName', 'birthdate', 'createdAt', 'purok']) });
  res.json(result);
});

exports.getDemographics = asyncHandler(async (req, res) => {
  const residents = await Resident.find().select('birthdate sex purok isVoter civilStatus residencyType');
  const total = residents.length;
  const ageBrackets = { '0-12': 0, '13-17': 0, '18-35': 0, '36-59': 0, '60+': 0 };
  const bySex = { male: 0, female: 0 };
  const byPurok = {};
  const byCivilStatus = {};
  let voters = 0;
  let seniors = 0;
  let ageSum = 0;
  let oldest = null;
  let youngest = null;

  residents.forEach((r) => {
    const age = ageOn(r.birthdate);
    ageSum += age;
    oldest = oldest === null ? age : Math.max(oldest, age);
    youngest = youngest === null ? age : Math.min(youngest, age);
    if (age <= 12) ageBrackets['0-12'] += 1;
    else if (age <= 17) ageBrackets['13-17'] += 1;
    else if (age <= 35) ageBrackets['18-35'] += 1;
    else if (age <= 59) ageBrackets['36-59'] += 1;
    else { ageBrackets['60+'] += 1; seniors += 1; }
    bySex[r.sex] = (bySex[r.sex] || 0) + 1;
    byPurok[r.purok] = (byPurok[r.purok] || 0) + 1;
    byCivilStatus[r.civilStatus] = (byCivilStatus[r.civilStatus] || 0) + 1;
    if (r.isVoter) voters += 1;
  });

  const adults = total - ageBrackets['0-12'] - ageBrackets['13-17'];
  res.json({
    total,
    averageAge: total ? Math.round((ageSum / total) * 10) / 10 : 0,
    oldestAge: oldest,
    youngestAge: youngest,
    seniors,
    voters,
    voterTurnoutBase: adults,
    voterRate: adults ? Math.round((voters / adults) * 1000) / 10 : 0,
    ageBrackets,
    bySex,
    byPurok: Object.entries(byPurok).map(([purok, count]) => ({ purok, count })).sort((a, b) => a.purok.localeCompare(b.purok)),
    byCivilStatus,
  });
});

exports.getResident = asyncHandler(async (req, res) => {
  const resident = await Resident.findById(req.params.id);
  if (!resident) throw ApiError.notFound('Resident');
  const [requests, payments, healthRecords, incidents] = await Promise.all([
    DocumentRequest.find({ resident: resident._id }).populate('documentType', 'name code').sort({ createdAt: -1 }),
    Payment.find({ resident: resident._id, isVoided: false }).sort({ paidAt: -1 }),
    HealthRecord.countDocuments({ resident: resident._id }),
    Incident.countDocuments({ reporter: resident._id }),
  ]);
  res.json({
    ...resident.toJSON(),
    summary: {
      totalRequests: requests.length,
      activeRequests: requests.filter((r) => ['pending', 'processing', 'ready'].includes(r.status)).length,
      totalPaid: Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100,
      healthRecords,
      incidentsReported: incidents,
    },
    recentRequests: requests.slice(0, 5),
  });
});

exports.createResident = asyncHandler(async (req, res) => {
  const resident = new Resident(pick(req.body));
  await resident.validate();
  resident.residentNo = await nextNumber('AMS');
  await resident.save();
  res.status(201).json(resident);
});

exports.updateResident = asyncHandler(async (req, res) => {
  const resident = await Resident.findById(req.params.id);
  if (!resident) throw ApiError.notFound('Resident');
  resident.set(pick(req.body));
  await resident.save();
  res.json(resident);
});

exports.deleteResident = asyncHandler(async (req, res) => {
  const resident = await Resident.findById(req.params.id);
  if (!resident) throw ApiError.notFound('Resident');
  const active = await DocumentRequest.countDocuments({ resident: resident._id, status: { $in: ['pending', 'processing', 'ready'] } });
  if (active > 0) throw ApiError.badRequest(`Cannot delete: resident has ${active} active document request(s)`);
  await resident.deleteOne();
  await User.deleteMany({ resident: resident._id });
  res.json({ message: 'Resident deleted', id: req.params.id });
});
