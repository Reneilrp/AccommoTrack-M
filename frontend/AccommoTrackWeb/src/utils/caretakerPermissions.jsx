/* eslint-disable react-refresh/only-export-components */
import {
  CheckCircle2,
  XCircle,
  Plus,
  Users,
  Mail,
  Building2,
  Shield,
  Calendar,
  Wallet,
  BarChart3,
} from 'lucide-react';

export const CARETAKER_PERMISSION_FIELDS = [
  {
    key: 'bookings',
    label: 'View Bookings',
    description: 'View reservation requests.',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  {
    key: 'approve_bookings',
    label: 'Approve Bookings',
    description: 'Accept pending booking requests.',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  {
    key: 'cancel_bookings',
    label: 'Cancel Bookings',
    description: 'Cancel active or pending bookings.',
    icon: <XCircle className="w-4 h-4" />,
  },
  {
    key: 'manual_bookings',
    label: 'Manual Bookings',
    description: 'Create bookings on behalf of tenants.',
    icon: <Plus className="w-4 h-4" />,
  },
  {
    key: 'tenants',
    label: 'Tenants',
    description: 'Access profiles and room assignments.',
    icon: <Users className="w-4 h-4" />,
  },
  {
    key: 'delete_tenants',
    label: 'Evict/Delete Tenant',
    description: 'Remove tenants from the system.',
    icon: <XCircle className="w-4 h-4" />,
  },
  {
    key: 'add_tenant_manually',
    label: 'Add Tenant Manually',
    description: 'Create tenant profiles without invites.',
    icon: <Plus className="w-4 h-4" />,
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'Chat with prospects and residents.',
    icon: <Mail className="w-4 h-4" />,
  },
  {
    key: 'rooms',
    label: 'Room Management',
    description: 'Full control over room availability.',
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    key: 'properties',
    label: 'Properties',
    description: 'View and manage property details.',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    key: 'manage_add_ons',
    label: 'Manage Add-ons',
    description: 'Approve or reject tenant add-ons.',
    icon: <Plus className="w-4 h-4" />,
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Handle repairs and upkeep requests.',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    key: 'payments',
    label: 'View Payments',
    description: 'Track rental transactions.',
    icon: <Wallet className="w-4 h-4" />,
  },
  {
    key: 'record_payments',
    label: 'Record Payments',
    description: 'Manually record tenant payments.',
    icon: <Wallet className="w-4 h-4" />,
  },
  {
    key: 'void_payments',
    label: 'Void Payments',
    description: 'Revoke or cancel incorrect payments.',
    icon: <XCircle className="w-4 h-4" />,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    description: 'View performance dashboards and trends.',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    key: 'view_audit_logs',
    label: 'Audit Logs',
    description: 'View tracking of actions & recent activity.',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
];

export const MODULE_GROUPS = [
  {
    title: 'Bookings',
    icon: <Calendar className="w-5 h-5" />,
    keys: ['bookings', 'approve_bookings', 'cancel_bookings', 'manual_bookings'],
  },
  {
    title: 'Tenant Management',
    icon: <Users className="w-5 h-5" />,
    keys: ['tenants', 'messages', 'add_tenant_manually', 'delete_tenants'],
  },
  {
    title: 'Properties & Rooms',
    icon: <Building2 className="w-5 h-5" />,
    keys: ['properties', 'rooms', 'maintenance', 'manage_add_ons'],
  },
  {
    title: 'Payments',
    icon: <Wallet className="w-5 h-5" />,
    keys: ['payments', 'record_payments', 'void_payments'],
  },
  {
    title: 'Analytics & Admin',
    icon: <BarChart3 className="w-5 h-5" />,
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
    label: 'Proxy Landlord',
    description: 'Full access to all landlord modules (landlord-like access).',
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
- [x] Caretaker Permissions & Role Templates
    - [x] [BACKEND] Migration: Add granular permission columns
    - [x] [BACKEND] Model: Update CaretakerAssignment fillable & casts
    - [x] [BACKEND] Controller: Update CaretakerController to support new fields
    - [x] [FRONTEND] Utils: Define ROLE_PRESETS in caretakerPermissions.jsx
 */

/**
 * Returns a short human-readable summary of active permission groups.
 * e.g. "Bookings · Tenants · Payments"
 * Returns "No permissions" if nothing is active.
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
 * Returns the count of active permissions out of total 14.
 */
export function countActivePermissions(permissionsObject) {
  if (!permissionsObject || typeof permissionsObject !== 'object') return 0;
  return CARETAKER_PERMISSION_FIELDS.filter((f) => !!permissionsObject[f.key]).length;
}

/**
 * Identifies if the current permissions match a specific role template.
 * Returns the role object if a match is found, otherwise returns null.
 */
export function identifyRole(permissionsObject) {
  if (!permissionsObject || typeof permissionsObject !== 'object') return null;

  // We find a match if ALL keys in the preset are active, AND NO OTHER keys are active.
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



