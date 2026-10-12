const ROLE_CAPABILITIES = {
  'staff.manage': ['super_admin'],

  'dashboard.view': ['super_admin', 'captain', 'secretary', 'treasurer', 'health_worker', 'tanod'],
  'residents.view': ['super_admin', 'captain', 'secretary', 'treasurer', 'health_worker', 'tanod'],
  'residents.manage': ['super_admin', 'secretary'],

  'documents.view': ['super_admin', 'captain', 'secretary', 'treasurer'],
  'documents.process': ['super_admin', 'secretary'],
  'document_types.manage': ['super_admin', 'secretary'],
  'schedule.manage': ['super_admin', 'captain', 'secretary'],

  'payments.view': ['super_admin', 'captain', 'treasurer'],
  'payments.manage': ['super_admin', 'treasurer'],

  'incidents.view': ['super_admin', 'captain', 'secretary', 'tanod'],
  'incidents.update': ['super_admin', 'captain', 'secretary', 'tanod'],
  'incidents.delete': ['super_admin', 'captain', 'secretary'],

  'sos.view': ['super_admin', 'captain', 'secretary', 'tanod'],
  'sos.respond': ['super_admin', 'secretary', 'tanod'],
  'sos.delete': ['super_admin', 'captain', 'secretary'],

  'blotter.view': ['super_admin', 'captain', 'secretary', 'tanod'],
  'blotter.manage': ['super_admin', 'secretary'],

  'bulletins.manage': ['super_admin', 'captain', 'secretary', 'health_worker'],

  'health.view': ['super_admin', 'captain', 'health_worker'],
  'health.manage': ['super_admin', 'health_worker'],

  'reports.view': ['super_admin', 'captain', 'secretary', 'treasurer'],
};

const ROLE_LABELS = {
  super_admin: 'Super admin',
  captain: 'Barangay captain',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  health_worker: 'Health worker',
  tanod: 'Tanod',
};

function permissionsFor(user) {
  if (!user || user.accountType !== 'staff') return [];
  return Object.keys(ROLE_CAPABILITIES).filter((cap) => ROLE_CAPABILITIES[cap].includes(user.role));
}

function hasPermission(user, capability) {
  return !!user && user.accountType === 'staff' && (ROLE_CAPABILITIES[capability] || []).includes(user.role);
}

module.exports = { ROLE_CAPABILITIES, ROLE_LABELS, permissionsFor, hasPermission };
