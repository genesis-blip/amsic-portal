const crypto = require('crypto');
const mongoose = require('mongoose');
const { toIsoDay, dayStart } = require('../services/dates');

const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6', 'Purok 7'];
const DEFAULT_ADDRESS = 'Brgy. Amsic, Angeles City, Pampanga';

const SLOT_BY_HOUR = { 8: '08:00-09:00', 9: '09:00-10:00', 13: '13:00-14:00', 14: '14:00-15:00' };

const newId = () => new mongoose.Types.ObjectId();
const str = (v) => (v === null || v === undefined ? '' : String(v).trim());
const cut = (v, max) => str(v).slice(0, max);
const lower = (v) => str(v).toLowerCase();

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'object' && typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'object' && typeof v._seconds === 'number') return new Date(v._seconds * 1000);
  if (typeof v === 'number') return new Date(v);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDay(v) {
  if (!v) return null;
  const s = typeof v === 'string' ? v.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return dayStart(s.slice(0, 10));
  if (s) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return dayStart(iso);
  }
  const d = toDate(v);
  return d ? dayStart(toIsoDay(d)) : null;
}

function dayAndTime(day, time) {
  const base = toDay(day);
  if (!base) return null;
  const m = str(time).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return new Date(base.getTime() + 4 * 3600 * 1000);
  let h = Number(m[1]);
  if (m[3]) h = (h % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return new Date(base.getTime() + (h - 8) * 3600 * 1000 + Number(m[2]) * 60000);
}

const notFuture = (d) => (d && d > new Date() ? new Date() : d);

function phone(v) {
  let d = str(v).replace(/\D/g, '');
  if (d.startsWith('63') && d.length === 12) d = `0${d.slice(2)}`;
  if (d.length === 10 && d.startsWith('9')) d = `0${d}`;
  return /^09\d{9}$/.test(d) ? d : undefined;
}

function email(v) {
  const e = lower(v);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : '';
}

function civil(v) {
  const c = lower(v);
  if (['single', 'married', 'widowed', 'separated'].includes(c)) return c;
  if (c === 'widow' || c === 'widower') return 'widowed';
  if (c === 'divorced' || c === 'annulled') return 'separated';
  return 'single';
}

function purokFrom(...texts) {
  for (const t of texts) {
    const m = str(t).match(/purok\s*(\d)/i);
    if (m && PUROKS.includes(`Purok ${m[1]}`)) return `Purok ${m[1]}`;
  }
  return null;
}

function slotFrom(label) {
  const m = str(label).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  if (m[3]) h = (h % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return SLOT_BY_HOUR[h] || null;
}

function slug(v) {
  return lower(v).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'document';
}

function atLeast(text, min, prefix) {
  const t = str(text);
  if (t.length >= min) return t;
  const withPrefix = [str(prefix), t].filter(Boolean).join(': ');
  return withPrefix.length >= min ? withPrefix : `${withPrefix} (imported record)`;
}

function mapFirebase(src, { year = new Date().getFullYear() } = {}) {
  const report = { changed: [], skipped: [] };
  const note = (kind, id, msg) => report.changed.push(`${kind} ${id}: ${msg}`);
  const skip = (kind, id, msg) => report.skipped.push(`${kind} ${id}: ${msg}`);
  const list = (name) => src[name] || [];

  const out = {
    residents: [], documentTypes: [], requests: [], payments: [], incidents: [],
    blotters: [], sosAlerts: [], bulletins: [], healthRecords: [], users: [],
  };

  const residentByOldId = new Map();
  const residentByUid = new Map();
  const requestByOldId = new Map();
  const typeByCode = new Map();

  function buildResident(kind, id, d, extra = {}) {
    const firstName = cut(d.first_name, 60);
    const lastName = cut(d.last_name, 60);
    if (!firstName || !lastName) { skip(kind, id, 'no first or last name'); return null; }

    const birthdate = toDay(d.birthdate || d.date_of_birth || d.birthday);
    if (!birthdate || birthdate > new Date()) { skip(kind, id, `${firstName} ${lastName} has no valid birthdate`); return null; }

    let sex = lower(d.gender || d.sex);
    if (!['male', 'female'].includes(sex)) {
      note(kind, id, `${firstName} ${lastName}: sex "${sex || 'blank'}" set to "male", please check`);
      sex = 'male';
    }

    let address = cut(d.address || extra.address, 200);
    if (!address) { address = DEFAULT_ADDRESS; note(kind, id, `${firstName} ${lastName}: no address, used "${DEFAULT_ADDRESS}"`); }

    let purok = purokFrom(d.purok, d.address);
    if (!purok) { purok = 'Purok 1'; note(kind, id, `${firstName} ${lastName}: purok not found in address, set to Purok 1`); }

    const contactRaw = d.contact_number || d.mobile || d.contact || extra.contact;
    const contactNumber = phone(contactRaw);
    if (str(contactRaw) && !contactNumber) note(kind, id, `${firstName} ${lastName}: contact "${str(contactRaw)}" is not 09XXXXXXXXX, left blank`);

    const residency = lower(d.residency_classification || d.residency_type);
    const createdAt = toDate(d.created_at) || new Date();

    return {
      _id: newId(),
      firstName,
      middleName: cut(d.middle_name, 60),
      lastName,
      suffix: cut(d.suffix, 10),
      birthdate,
      sex,
      civilStatus: civil(d.civil_status),
      purok,
      address,
      contactNumber,
      email: email(d.email || extra.email),
      occupation: cut(d.profession || d.occupation, 80),
      isVoter: d.is_voter === true || lower(d.is_voter) === 'yes',
      residencyType: ['migrant', 'transient'].includes(residency) ? residency : 'non_migrant',
      yearsOfResidency: Math.min(120, Math.max(0, parseInt(d.years_of_residency, 10) || 0)),
      createdAt,
      updatedAt: toDate(d.updated_at) || createdAt,
    };
  }

  for (const { id, data: d } of list('residents')) {
    if (d.is_active === false) { skip('resident', id, 'inactive (deleted in the old portal)'); continue; }
    const r = buildResident('resident', id, d);
    if (!r) continue;
    out.residents.push(r);
    residentByOldId.set(id, r._id);
    if (d.user_id) residentByUid.set(d.user_id, r._id);
  }

  for (const { id, data: d } of list('users')) {
    if (residentByUid.has(id)) continue;
    if (d.role && d.role !== 'resident') continue;
    if (d.is_active === false) { skip('user', id, 'inactive account'); continue; }
    const r = buildResident('user', id, d);
    if (!r) continue;
    out.residents.push(r);
    residentByUid.set(id, r._id);
  }

  function residentFor(kind, id, d) {
    if (d.resident_id && residentByOldId.has(d.resident_id)) return residentByOldId.get(d.resident_id);
    if (d.user_id && residentByUid.has(d.user_id)) return residentByUid.get(d.user_id);
    if (!d.first_name || !d.last_name || !(d.birthdate || d.date_of_birth)) return null;
    const r = buildResident(kind, id, d, { contact: d.contact, address: d.address });
    if (!r) return null;
    out.residents.push(r);
    note(kind, id, `created resident ${r.firstName} ${r.lastName} from the details on this record`);
    if (d.resident_id) residentByOldId.set(d.resident_id, r._id);
    if (d.user_id) residentByUid.set(d.user_id, r._id);
    return r._id;
  }

  out.residents.sort((a, b) => a.createdAt - b.createdAt);
  out.residents.forEach((r, i) => { r.residentNo = `AMS-${year}-${String(i + 1).padStart(5, '0')}`; });
  let residentSeq = out.residents.length;
  const numberNewResidents = () => {
    for (const r of out.residents) if (!r.residentNo) r.residentNo = `AMS-${year}-${String(++residentSeq).padStart(5, '0')}`;
  };

  for (const { id, data: d } of list('document_types')) {
    const code = slug(d.type_code || id);
    if (typeByCode.has(code)) continue;
    const reqs = Array.isArray(d.requirements)
      ? d.requirements.map(str).filter(Boolean)
      : str(d.requirements).split(/\r?\n|;|,(?=\s*[A-Z])/).map(str).filter(Boolean);
    const t = {
      _id: newId(),
      code,
      name: cut(d.type_name || d.name || id, 80),
      description: cut(d.description, 300),
      fee: Math.min(5000, Math.max(0, Number(d.fee) || 0)),
      processingDays: Math.min(30, Math.max(0, parseInt(d.processing_days, 10) || 0)),
      requirements: reqs,
      isActive: d.is_active !== false,
    };
    out.documentTypes.push(t);
    typeByCode.set(code, t);
    typeByCode.set(id, t);
  }

  function typeFor(d) {
    const code = d.document_type_id ? slug(d.document_type_id) : slug(d.document_type_name);
    if (typeByCode.has(d.document_type_id)) return typeByCode.get(d.document_type_id);
    if (typeByCode.has(code)) return typeByCode.get(code);
    const copies = Math.max(1, parseInt(d.copies, 10) || 1);
    const t = {
      _id: newId(), code, name: cut(d.document_type_name || code, 80), description: '',
      fee: Math.min(5000, Math.max(0, (Number(d.fee_subtotal) || 0) / copies)), processingDays: 1,
      requirements: [], isActive: true,
    };
    out.documentTypes.push(t);
    typeByCode.set(code, t);
    note('document type', code, 'not in document_types, created from a request');
    return t;
  }

  const REQ_STATUS = { pending: 'pending', processing: 'processing', ready: 'ready', released: 'released', rejected: 'rejected', cancelled: 'cancelled', canceled: 'cancelled', completed: 'released' };
  for (const { id, data: d } of list('document_requests')) {
    const resident = residentFor('request', id, d);
    if (!resident) { skip('request', id, `${str(d.reference_number)}: resident not found`); continue; }
    const type = typeFor(d);

    const copies = Math.min(10, Math.max(1, parseInt(d.copies, 10) || 1));
    const subtotal = Number(d.fee_subtotal ?? (type.fee * copies)) || 0;
    const discount = Number(d.senior_discount_amount) || 0;
    const total = Number(d.total_fee ?? (subtotal - discount)) || 0;
    const isSenior = d.is_senior_citizen === true || d.is_senior_citizen === 1 || discount > 0;

    const createdAt = toDate(d.created_at) || new Date();
    let pickupDate = toDay(d.pickup_date);
    if (!pickupDate) { pickupDate = toDay(createdAt); note('request', id, 'no pickup date, used the request date'); }
    let pickupSlot = slotFrom(d.pickup_time);
    if (!pickupSlot) { pickupSlot = '08:00-09:00'; note('request', id, `pickup time "${str(d.pickup_time)}" not recognised, set to 08:00-09:00`); }

    const status = REQ_STATUS[lower(d.status)] || 'pending';
    let paymentStatus = { paid: 'paid', unpaid: 'unpaid', 'n/a': 'waived', waived: 'waived', free: 'waived' }[lower(d.payment_status)] || 'unpaid';
    if (total <= 0) paymentStatus = 'waived';

    const updatedAt = toDate(d.updated_at) || createdAt;
    const releasedAt = status === 'released' ? (toDate(d.release_date) || updatedAt) : undefined;
    const history = [{ status: 'pending', note: 'Request filed (imported from the old portal)', changedAt: createdAt }];
    if (status !== 'pending') history.push({ status, note: cut(d.admin_notes, 300), changedAt: releasedAt || updatedAt });

    const purpose = atLeast([str(d.purpose), str(d.purpose_details)].filter(Boolean).join(' – '), 3, 'Purpose');

    const r = {
      _id: newId(),
      referenceNumber: str(d.reference_number) || `BRG-IMP-${id.slice(0, 8)}`,
      resident,
      documentType: type._id,
      purpose: cut(purpose, 200),
      copies,
      pickupDate,
      pickupSlot,
      fees: { unitFee: subtotal / copies, subtotal, discountRate: isSenior ? 0.2 : 0, discount, total },
      isSenior,
      status,
      paymentStatus,
      statusHistory: history,
      releasedAt,
      remarks: cut(d.admin_notes, 500),
      createdAt,
      updatedAt,
    };
    out.requests.push(r);
    requestByOldId.set(id, r);
  }

  const METHOD = { cash: 'cash', gcash: 'gcash', maya: 'maya', paymaya: 'maya', bank_transfer: 'bank_transfer', check: 'bank_transfer', qrph: 'gcash', card: 'bank_transfer' };
  const CATEGORY = { document_fee: 'document_fee', permit_fee: 'business_fee', business_fee: 'business_fee', fine: 'fine', donation: 'donation' };
  for (const { id, data: d } of list('payments')) {
    const amount = Number(d.amount) || 0;
    if (amount < 1) { skip('payment', id, `${str(d.or_number)}: amount ${amount}`); continue; }
    const req = d.request_id ? requestByOldId.get(d.request_id) : null;
    const rawMethod = lower(d.payment_method);
    const method = METHOD[rawMethod] || 'cash';
    const via = rawMethod && rawMethod !== method ? `paid via ${rawMethod === 'qrph' ? 'QR Ph' : rawMethod}` : '';
    const description = [str(d.description), str(d.remarks), via].filter(Boolean).join(' – ');
    const paidAt = toDate(d.payment_date || d.paid_at || d.created_at) || new Date();
    out.payments.push({
      _id: newId(),
      orNumber: str(d.or_number) || `OR-IMP-${id.slice(0, 8)}`,
      request: req ? req._id : undefined,
      resident: req ? req.resident : (residentByOldId.get(d.resident_id) || undefined),
      payerName: cut(d.payer_name, 120) || 'Unknown payer',
      amount: Math.min(100000, amount),
      method,
      category: CATEGORY[lower(d.payment_type)] || (req ? 'document_fee' : 'other'),
      description: cut(description, 200),
      paidAt,
      isVoided: d.is_voided === true || d.is_voided === 1,
      voidReason: cut(d.void_reason, 200),
      voidedAt: toDate(d.voided_at) || undefined,
      createdAt: paidAt,
      updatedAt: paidAt,
    });
  }

  const INC_TYPE = { noise: 'noise', theft: 'theft', vandalism: 'vandalism', dispute: 'dispute', assault: 'dispute', accident: 'accident', fire: 'fire', flood: 'flood', stray_animal: 'stray_animal' };
  for (const { id, data: d } of list('incident_reports')) {
    if (d.hidden === true || d.is_deleted === true) { skip('incident', id, 'deleted in the old portal'); continue; }
    const rawType = lower(d.incident_type).replace(/\s+/g, '_');
    const type = INC_TYPE[rawType] || 'other';
    const createdAt = toDate(d.created_at) || new Date();
    const occurredAt = notFuture(d.incident_date ? dayAndTime(d.incident_date, d.incident_time) : createdAt) || createdAt;
    const status = ['open', 'under_review', 'resolved', 'dismissed'].includes(lower(d.status)) ? lower(d.status) : 'open';
    const changedType = rawType && rawType !== type;
    const label = changedType ? rawType.replace(/_/g, ' ') : type;
    out.incidents.push({
      _id: newId(),
      reporter: residentFor('incident', id, { ...d, birthdate: null }) || undefined,
      reporterName: cut(`${str(d.first_name)} ${str(d.last_name)}`, 120) || 'Anonymous',
      type,
      description: cut(atLeast(changedType ? `[${label}] ${str(d.description)}` : d.description, 10, `${label} report`), 1000),
      location: cut(d.location || d.address, 200) || 'Brgy. Amsic',
      occurredAt,
      urgency: ['low', 'medium', 'high', 'critical'].includes(lower(d.urgency)) ? lower(d.urgency) : 'medium',
      status,
      resolutionNotes: cut(d.admin_notes, 1000),
      resolvedAt: ['resolved', 'dismissed'].includes(status) ? (toDate(d.reviewed_at) || createdAt) : undefined,
      createdAt,
      updatedAt: toDate(d.reviewed_at) || createdAt,
    });
  }

  const BLT_STATUS = { open: 'filed', filed: 'filed', for_hearing: 'for_hearing', under_mediation: 'mediation', mediation: 'mediation', settled: 'settled', endorsed: 'escalated', escalated: 'escalated', dismissed: 'dismissed', closed: 'settled' };
  const party = (p) => (typeof p === 'string' ? { name: p } : (p || {}));
  for (const { id, data: d, actions = [] } of list('blotter_records')) {
    if (d.is_deleted === true) { skip('blotter', id, 'deleted in the old portal'); continue; }
    const comp = party(d.complainant);
    const resp = party(d.respondent);
    if (!str(comp.name) || !str(resp.name)) { skip('blotter', id, `${str(d.case_number)}: missing complainant or respondent`); continue; }
    const createdAt = toDate(d.created_at) || new Date();
    const hearingDate = d.next_hearing_date ? dayAndTime(d.next_hearing_date, '09:00') : undefined;
    let status = BLT_STATUS[lower(d.status)] || 'filed';
    if (status === 'filed' && hearingDate) status = 'for_hearing';
    const closed = ['settled', 'escalated', 'dismissed'].includes(status);

    const details = [str(d.narrative), str(d.resolution) ? `Resolution: ${str(d.resolution)}` : '', str(d.witnesses) ? `Witnesses: ${str(d.witnesses)}` : '']
      .filter(Boolean).join('\n\n');

    const acts = actions
      .map(({ data: a }) => ({ text: str(a.note), date: toDate(a.created_at) || createdAt, hearing: a.hearing_date }))
      .filter((a) => a.text)
      .sort((a, b) => a.date - b.date)
      .map((a) => ({
        action: cut(a.text.split(/[.\n]/)[0] || a.text, 120),
        note: cut(a.hearing ? `${a.text} (hearing: ${str(a.hearing)})` : a.text, 500),
        date: a.date,
      }));

    out.blotters.push({
      _id: newId(),
      caseNumber: str(d.case_number) || `BLT-IMP-${id.slice(0, 8)}`,
      complainant: (comp.resident_id && residentByOldId.get(comp.resident_id)) || (comp.user_id && residentByUid.get(comp.user_id)) || undefined,
      complainantName: cut(comp.name, 120),
      respondentName: cut(resp.name, 120),
      nature: cut(d.nature, 120) || 'Unspecified',
      details: cut(atLeast(details, 10, d.nature || 'Complaint'), 2000),
      incidentDate: notFuture(d.incident_date ? dayAndTime(d.incident_date, d.incident_time) : createdAt) || createdAt,
      hearingDate,
      status,
      actions: acts,
      closedAt: closed ? (toDate(d.updated_at) || createdAt) : undefined,
      createdAt,
      updatedAt: toDate(d.updated_at) || createdAt,
    });
  }

  const SOS_TYPE = ['medical', 'fire', 'crime', 'flood', 'accident'];
  for (const { id, data: d } of list('sos_alerts')) {
    if (d.hidden === true) { skip('sos', id, 'deleted in the old portal'); continue; }
    const resident = residentFor('sos', id, d);
    if (!resident) { skip('sos', id, `${str(d.full_name) || 'unknown'}: resident not found`); continue; }
    const text = str(d.description) || 'SOS Emergency Alert';
    const type = SOS_TYPE.find((t) => lower(d.emergency_type || d.type || text).includes(t)) || 'other';
    const lat = Number(d.latitude);
    const lng = Number(d.longitude);
    const hasGeo = d.latitude !== null && d.latitude !== undefined && Number.isFinite(lat) && Number.isFinite(lng);
    const createdAt = toDate(d.created_at) || new Date();
    const status = ['active', 'acknowledged', 'resolved'].includes(lower(d.status)) ? lower(d.status) : 'active';
    out.sosAlerts.push({
      _id: newId(),
      resident,
      emergencyType: type,
      message: cut(text, 500),
      location: cut(d.location_text || d.resolved_address || (hasGeo ? `${lat}, ${lng}` : ''), 200) || 'Location not shared',
      latitude: hasGeo ? lat : undefined,
      longitude: hasGeo ? lng : undefined,
      status,
      acknowledgedAt: toDate(d.acknowledged_at) || undefined,
      resolvedAt: toDate(d.resolved_at) || undefined,
      createdAt,
      updatedAt: toDate(d.resolved_at) || toDate(d.acknowledged_at) || createdAt,
    });
  }

  const BUL_CAT = ['announcement', 'event', 'advisory', 'health', 'emergency'];
  for (const { id, data: d } of list('bulletins_db')) {
    if (d.is_published === false) { skip('bulletin', id, `"${str(d.title)}" is unpublished or deleted`); continue; }
    const title = str(d.title);
    if (title.length < 4) { skip('bulletin', id, `title "${title}" is too short`); continue; }
    const cat = lower(d.category);
    const createdAt = toDate(d.created_at) || new Date();
    out.bulletins.push({
      _id: newId(),
      title: cut(title, 120),
      content: cut(atLeast(d.content, 10, title), 3000),
      category: BUL_CAT.includes(cat) ? cat : (cat === 'news' ? 'announcement' : cat === 'alert' ? 'emergency' : 'announcement'),
      eventDate: d.event_date ? dayAndTime(d.event_date, d.event_time) : undefined,
      expiresAt: d.expiry_date ? toDay(d.expiry_date) : undefined,
      isPinned: d.is_featured === true || d.is_featured === 1,
      createdAt,
      updatedAt: toDate(d.updated_at) || createdAt,
    });
  }

  const healthResident = (kind, id, d) => residentByOldId.get(d.resident_id || id) || residentByUid.get(d.user_id) || null;
  const pushHealth = (kind, id, rec) => {
    if (rec.nextDueDate && rec.nextDueDate <= rec.visitDate) {
      note(kind, id, 'next due date was not after the visit date, removed');
      delete rec.nextDueDate;
    }
    out.healthRecords.push({ _id: newId(), ...rec, notes: cut(rec.notes, 1000), createdAt: rec.visitDate, updatedAt: rec.visitDate });
  };
  const joinNotes = (pairs) => pairs.filter(([, v]) => str(v) && str(v) !== 'none').map(([k, v]) => `${k}: ${str(v)}`).join('\n');

  for (const { id, data: d } of list('health_records')) {
    const resident = healthResident('health profile', id, d);
    if (!resident) { skip('health profile', id, 'resident not found'); continue; }
    const notes = joinNotes([['Blood type', d.blood_type], ['Allergies', d.allergies], ['Chronic conditions', d.chronic_conditions], ['Medications', d.medications], ['Notes', d.notes]]);
    if (!notes) continue;
    pushHealth('health profile', id, { resident, recordType: 'checkup', visitDate: notFuture(toDate(d.updated_at || d.created_at)) || new Date(), notes: `Health profile (imported)\n${notes}` });
  }

  for (const { id, data: d } of list('vaccination_records')) {
    const resident = healthResident('vaccination', id, d);
    if (!resident) { skip('vaccination', id, 'resident not found'); continue; }
    if (!str(d.vaccine_name)) { skip('vaccination', id, 'no vaccine name'); continue; }
    const dose = parseInt(str(d.dose_number).replace(/\D/g, ''), 10);
    pushHealth('vaccination', id, {
      resident,
      recordType: 'vaccination',
      visitDate: toDay(d.date_administered) || toDay(d.created_at) || toDay(new Date()),
      vaccineName: cut(d.vaccine_name, 80),
      doseNumber: dose >= 1 && dose <= 10 ? dose : undefined,
      nextDueDate: toDay(d.next_due_date) || undefined,
      notes: joinNotes([['Status', d.status], ['Patient type', d.patient_type], ['Batch no.', d.batch_no], ['Notes', d.notes]]),
    });
  }

  for (const { id, data: d } of list('pregnancy_records')) {
    const resident = healthResident('prenatal', id, d);
    if (!resident) { skip('prenatal', id, 'resident not found'); continue; }
    pushHealth('prenatal', id, {
      resident,
      recordType: 'prenatal',
      visitDate: notFuture(toDay(d.updated_at || d.created_at) || toDay(d.lmp_date)) || toDay(new Date()),
      nextDueDate: toDay(d.edc_date) || undefined,
      notes: joinNotes([['LMP', d.lmp_date], ['Expected delivery', d.edc_date], ['High risk', d.is_high_risk ? 'yes' : ''], ['Prenatal check-ups', d.prenatal_checkups || ''], ['Status', d.status], ['Notes', d.notes]]),
    });
  }

  for (const { id, data: d } of list('senior_citizen_records')) {
    const resident = healthResident('senior', id, d);
    if (!resident) { skip('senior', id, 'resident not found'); continue; }
    pushHealth('senior', id, {
      resident,
      recordType: 'senior_monitoring',
      visitDate: notFuture(toDay(d.last_checkup_date) || toDay(d.updated_at || d.created_at)) || toDay(new Date()),
      notes: joinNotes([['OSCA ID', d.osca_id], ['Pension', d.pension_status], ['Health condition', d.health_condition], ['Mobility', d.mobility_status], ['Notes', d.notes]]),
    });
  }

  const STAFF_ROLES = ['super_admin', 'captain', 'secretary', 'treasurer', 'health_worker', 'tanod'];
  const authByUid = new Map(list('auth_users').map((u) => [u.localId || u.uid, u]));
  const taken = new Set();
  const cleanUsername = (raw, fallback) => {
    let u = lower(raw).replace(/[^a-z0-9._-]/g, '').slice(0, 30);
    if (u.length < 4) u = lower(fallback).replace(/[^a-z0-9._-]/g, '').slice(0, 26) || 'user';
    if (u.length < 4) u = `${u}user`.slice(0, 30);
    let candidate = u;
    for (let n = 2; taken.has(candidate); n += 1) candidate = `${u.slice(0, 26)}${n}`;
    taken.add(candidate);
    return candidate;
  };
  const tempPassword = () => `amsic-${crypto.randomInt(1000, 9999)}-${crypto.randomBytes(2).toString('hex')}`;
  const credentials = (uid) => {
    const a = authByUid.get(uid);
    if (a?.passwordHash && a?.salt) return { legacyHash: { hash: a.passwordHash, salt: a.salt } };
    return { tempPassword: tempPassword(), mustChangePassword: true };
  };

  for (const { id, data: d } of list('users')) {
    if (d.role && d.role !== 'resident') continue;
    if (d.is_active === false) continue;
    const resident = residentByUid.get(id);
    if (!resident) { skip('account', id, `${str(d.username) || `${str(d.first_name)} ${str(d.last_name)}`}: no resident record, so no account`); continue; }
    const mail = email(d.email || authByUid.get(id)?.email);
    out.users.push({
      _id: newId(),
      username: cleanUsername(d.username, `${str(d.first_name)}.${str(d.last_name)}`.replace(/\s+/g, '')),
      email: mail,
      accountType: 'resident',
      resident,
      isActive: true,
      firebaseUid: id,
      createdAt: toDate(d.created_at) || new Date(),
      ...credentials(id),
    });
  }

  for (const { id, data: d } of list('staff_accounts')) {
    const role = lower(d.role);
    if (!STAFF_ROLES.includes(role)) { skip('staff account', id, `${str(d.username)}: role "${role}" does not exist in the new app`); continue; }
    const mail = email(d.email || authByUid.get(id)?.email);
    out.users.push({
      _id: newId(),
      username: cleanUsername(d.username, `${str(d.first_name)}.${str(d.last_name)}`.replace(/\s+/g, '')),
      email: mail,
      accountType: 'staff',
      role,
      firstName: cut(d.first_name, 60),
      lastName: cut(d.last_name, 60),
      mobile: phone(d.mobile) || '',
      isActive: d.is_active !== false,
      firebaseUid: id,
      createdAt: toDate(d.created_at) || new Date(),
      ...credentials(id),
    });
  }
  const seenMail = new Set();
  for (const u of out.users) {
    if (!u.email) continue;
    if (seenMail.has(u.email)) { note('account', u.username, `email ${u.email} is used by another account, left blank`); u.email = ''; } else seenMail.add(u.email);
  }

  numberNewResidents();
  return { ...out, report };
}

module.exports = { mapFirebase, toDay, toDate, slotFrom, phone };
