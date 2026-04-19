export const CARETAKER_PERMISSION_FIELDS = [
  {
    key: 'bookings',
    label: 'View Bookings',
    description: 'View reservation requests.',
  },
  {
    key: 'approve_bookings',
    label: 'Approve Bookings',
    description: 'Accept pending booking requests.',
  },
  {
    key: 'cancel_bookings',
    label: 'Cancel Bookings',
    description: 'Cancel active or pending bookings.',
  },
  {
    key: 'manual_bookings',
    label: 'Manual Bookings',
    description: 'Create bookings on behalf of tenants.',
  },
  {
    key: 'tenants',
    label: 'Tenants',
    description: 'Access profiles and room assignments.',
  },
  {
    key: 'delete_tenants',
    label: 'Evict/Delete Tenant',
    description: 'Remove tenants from the system.',
  },
  {
    key: 'add_tenant_manually',
    label: 'Add Tenant Manually',
    description: 'Create tenant profiles without invites.',
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'Chat with prospects and residents.',
  },
  {
    key: 'rooms',
    label: 'Room Management',
    description: 'Full control over room availability.',
  },
  {
    key: 'properties',
    label: 'Properties',
    description: 'View and manage property details.',
  },
  {
    key: 'manage_add_ons',
    label: 'Manage Add-ons',
    description: 'Approve or reject tenant add-ons.',
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Handle repairs and upkeep requests.',
  },
  {
    key: 'payments',
    label: 'View Payments',
    description: 'Track rental transactions.',
  },
  {
    key: 'record_payments',
    label: 'Record Payments',
    description: 'Manually record tenant payments.',
  },
  {
    key: 'void_payments',
    label: 'Void Payments',
    description: 'Revoke or cancel incorrect payments.',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'View performance dashboards and trends.',
  },
  {
    key: 'view_audit_logs',
    label: 'Audit Logs',
    description: 'View tracking of actions & recent activity.',
  },
];

export const MODULE_GROUPS = [
  {
    title: 'Bookings',
    icon: 'calendar-outline',
    keys: ['bookings', 'approve_bookings', 'cancel_bookings', 'manual_bookings'],
  },
  {
    title: 'Tenant Management',
    icon: 'people-outline',
    keys: ['tenants', 'messages', 'add_tenant_manually', 'delete_tenants'],
  },
  {
    title: 'Properties & Rooms',
    icon: 'business-outline',
    keys: ['properties', 'rooms', 'maintenance', 'manage_add_ons'],
  },
  {
    title: 'Payments',
    icon: 'wallet-outline',
    keys: ['payments', 'record_payments', 'void_payments'],
  },
  {
    title: 'Analytics & Admin',
    icon: 'stats-chart-outline',
    keys: ['analytics', 'view_audit_logs'],
  },
];

export const LANDLORD_LEVEL_PERMISSION_KEYS = new Set([
  'rooms',
  'properties',
  'maintenance',
  'payments',
  'record_payments',
  'void_payments',
  'analytics',
  'view_audit_logs',
  'approve_bookings',
  'cancel_bookings',
  'manage_add_ons',
  'add_tenant_manually',
  'delete_tenants',
  'manual_bookings',
]);

export const ROLE_PRESETS = [
  {
    id: 'receptionist',
    label: 'Receptionist',
    description: 'Front desk operations: Bookings, Tenants, and Messages.',
    permissions: ['bookings', 'messages', 'tenants'],
  },
  {
    id: 'manager',
    label: 'Property Manager',
    description: 'Full operational control: Rooms, Maintenance, and Approvals.',
    permissions: [
      'bookings', 'approve_bookings', 'cancel_bookings',
      'tenants', 'messages', 'add_tenant_manually',
      'properties', 'rooms', 'maintenance', 'manage_add_ons'
    ],
  },
  {
    id: 'finance',
    label: 'Finance Officer',
    description: 'Financial oversight: Payments and Analytics.',
    permissions: ['payments', 'record_payments', 'analytics'],
  },
  {
    id: 'admin',
    label: 'General Manager',
    description: 'Full access to all landlord modules.',
    permissions: CARETAKER_PERMISSION_FIELDS.map(f => f.key),
  },
];

export const LANDLORD_LEVEL_PERMISSION_MESSAGES = {
  rooms: 'Enabling this allows caretakers to modify room availability and tenant placements.',
  properties: 'Enabling this allows caretakers to edit core property details and settings.',
  maintenance: 'Enabling this allows caretakers to process and update maintenance workflows.',
  payments: 'Enabling this allows caretakers to manage sensitive billing and payment operations.',
  analytics: 'Enabling this allows caretakers to view occupancy, revenue, and trend insights.',
  view_audit_logs: 'Enabling this allows caretakers to view exact tracking of property actions.',
  approve_bookings: 'Enabling this gives explicit right to accept or approve new booking requests.',
  cancel_bookings: 'Enabling this gives explicit right to decline, cancel, or reject bookings.',
  manage_add_ons: 'Enabling this allows the caretaker to approve or modify tenant add-ons.',
  add_tenant_manually: 'Enabling this allows caretakers to securely add new tenants into the system.',
  delete_tenants: 'DANGER: Allows the caretaker to permanently remove tenants and histories.',
  manual_bookings: 'Enabling this allows caretakers to place override bookings forcefully behind the scenes.',
  record_payments: 'Allows the caretaker to manually record cash or off-platform payments.',
  void_payments: 'DANGER: Allows the caretaker to void or delete existing payment records.',
};

/**
 * Returns a short human-readable summary of active permission groups.
 */
export function humanizePermissions(permissionsObject) {
  if (!permissionsObject || typeof permissionsObject !== 'object') return 'No permissions';

  const activeGroups = MODULE_GROUPS.filter((group) =>
    group.keys.some((k) => !!permissionsObject[k]),
  ).map((g) => g.title);

  if (activeGroups.length === 0) return 'No permissions';
  return activeGroups.join(' · ');
}

/**
 * Returns the count of active permissions.
 */
export function countActivePermissions(permissionsObject) {
  if (!permissionsObject || typeof permissionsObject !== 'object') return 0;
  return CARETAKER_PERMISSION_FIELDS.filter((f) => !!permissionsObject[f.key]).length;
}

/**
 * Identifies if the current permissions match a specific role template.
 */
export function identifyRole(permissionsObject) {
  if (!permissionsObject || typeof permissionsObject !== 'object') return null;

  const activeKeys = Object.keys(permissionsObject).filter((k) => !!permissionsObject[k]);
  
  return ROLE_PRESETS.find((role) => {
    if (activeKeys.length !== role.permissions.length) return false;
    return role.permissions.every((k) => activeKeys.includes(k));
  });
}

/**
 * Returns the best human-readable label for a caretaker's role.
 * Prioritizes custom_role_name, then preset labels, then "Custom Access".
 */
export function getRoleLabel(permissionsObject, customRoleName) {
  if (customRoleName && customRoleName.trim()) {
    return customRoleName;
  }
  
  const matchedRole = identifyRole(permissionsObject);
  return matchedRole ? matchedRole.label : 'Custom Access';
}
