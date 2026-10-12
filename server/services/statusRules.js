const REQUEST_FLOW = {
  pending: ['processing', 'rejected', 'cancelled'],
  processing: ['ready', 'rejected', 'cancelled'],
  ready: ['released', 'cancelled'],
  released: [],
  rejected: [],
  cancelled: [],
};

const INCIDENT_FLOW = {
  open: ['under_review', 'dismissed'],
  under_review: ['resolved', 'dismissed'],
  resolved: [],
  dismissed: [],
};

const BLOTTER_FLOW = {
  filed: ['for_hearing', 'dismissed'],
  for_hearing: ['mediation', 'settled', 'escalated', 'dismissed'],
  mediation: ['settled', 'escalated', 'for_hearing'],
  settled: [],
  escalated: [],
  dismissed: [],
};

const SOS_FLOW = {
  active: ['acknowledged', 'resolved'],
  acknowledged: ['resolved'],
  resolved: [],
};

function assertTransition(flow, from, to, label = 'Status') {
  if (!Object.prototype.hasOwnProperty.call(flow, to)) {
    const err = new Error(`${label} must be one of: ${Object.keys(flow).join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  if (!flow[from] || !flow[from].includes(to)) {
    const allowed = flow[from] && flow[from].length ? flow[from].join(', ') : 'none (final status)';
    const err = new Error(`Cannot change ${label.toLowerCase()} from "${from}" to "${to}". Allowed: ${allowed}`);
    err.statusCode = 400;
    throw err;
  }
}

module.exports = { REQUEST_FLOW, INCIDENT_FLOW, BLOTTER_FLOW, SOS_FLOW, assertTransition };
