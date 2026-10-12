const Resident = require('../models/Resident');
const DocumentRequest = require('../models/DocumentRequest');
const DocumentType = require('../models/DocumentType');
const Payment = require('../models/Payment');
const Incident = require('../models/Incident');
const BlotterRecord = require('../models/BlotterRecord');
const SosAlert = require('../models/SosAlert');
const asyncHandler = require('../utils/asyncHandler');
const { toIsoDay, dayStart, MS_PER_DAY } = require('../services/dates');

const round2 = (n) => Math.round(n * 100) / 100;
const countBy = (items, key) => items.reduce((acc, it) => ({ ...acc, [it[key]]: (acc[it[key]] || 0) + 1 }), {});

exports.getOverview = asyncHandler(async (req, res) => {
  const todayIso = toIsoDay();
  const today = dayStart(todayIso);
  const monthStart = dayStart(`${todayIso.slice(0, 7)}-01`);

  const [residents, requests, types, payments, incidents, blotters, sos] = await Promise.all([
    Resident.countDocuments(),
    DocumentRequest.find().select('status paymentStatus fees documentType createdAt releasedAt pickupDate'),
    DocumentType.find().select('name'),
    Payment.find({ isVoided: false }).select('amount paidAt'),
    Incident.find().select('status urgency type'),
    BlotterRecord.find().select('status'),
    SosAlert.find().select('status'),
  ]);

  const byStatus = countBy(requests, 'status');
  const typeName = Object.fromEntries(types.map((t) => [String(t._id), t.name]));
  const byTypeMap = {};
  requests.forEach((r) => { const n = typeName[String(r.documentType)] || 'Other'; byTypeMap[n] = (byTypeMap[n] || 0) + 1; });
  const topDocuments = Object.entries(byTypeMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  const released = requests.filter((r) => r.releasedAt);
  const avgTurnaroundDays = released.length
    ? round2(released.reduce((s, r) => s + (r.releasedAt - r.createdAt) / MS_PER_DAY, 0) / released.length)
    : null;
  const pickupsToday = requests.filter((r) => toIsoDay(r.pickupDate) === todayIso && ['pending', 'processing', 'ready'].includes(r.status)).length;
  const unpaidBalance = round2(requests.filter((r) => r.paymentStatus === 'unpaid' && !['cancelled', 'rejected'].includes(r.status)).reduce((s, r) => s + r.fees.total, 0));

  const sum = (list) => round2(list.reduce((s, p) => s + p.amount, 0));
  const collectedToday = sum(payments.filter((p) => p.paidAt >= today));
  const collectedThisMonth = sum(payments.filter((p) => p.paidAt >= monthStart));

  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const trend = months.map((m) => ({
    month: m,
    requests: requests.filter((r) => toIsoDay(r.createdAt).slice(0, 7) === m).length,
    collected: sum(payments.filter((p) => toIsoDay(p.paidAt).slice(0, 7) === m)),
  }));

  res.json({
    generatedAt: new Date(),
    residents: { total: residents },
    requests: {
      total: requests.length,
      byStatus,
      active: (byStatus.pending || 0) + (byStatus.processing || 0) + (byStatus.ready || 0),
      pickupsToday,
      avgTurnaroundDays,
      unpaidBalance,
      topDocuments,
    },
    collections: { today: collectedToday, thisMonth: collectedThisMonth, allTime: sum(payments) },
    incidents: { total: incidents.length, open: incidents.filter((i) => ['open', 'under_review'].includes(i.status)).length, byStatus: countBy(incidents, 'status'), byUrgency: countBy(incidents, 'urgency') },
    blotters: { total: blotters.length, open: blotters.filter((b) => !['settled', 'escalated', 'dismissed'].includes(b.status)).length, byStatus: countBy(blotters, 'status') },
    sos: { active: sos.filter((s) => s.status === 'active').length, total: sos.length },
    trend,
  });
});
