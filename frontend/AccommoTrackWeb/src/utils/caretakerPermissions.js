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
    label: 'Payments',
    description: 'Track and verify rental transactions.',
    icon: <Wallet className="w-4 h-4" />,
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
    keys: ['tenants', 'messages', 'add_tenant_manually'],
  },
  {
    title: 'Properties & Rooms',
    icon: <Building2 className="w-5 h-5" />,
    keys: ['properties', 'rooms', 'maintenance', 'manage_add_ons'],
  },
  {
    title: 'Payments',
    icon: <Wallet className="w-5 h-5" />,
    keys: ['payments'],
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
  'analytics',
  'view_audit_logs',
  'approve_bookings',
  'cancel_bookings',
  'manage_add_ons',
  'add_tenant_manually',
  'manual_bookings',
]);

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
  manual_bookings: 'Enabling this allows caretakers to place override bookings forcefully behind the scenes.',
};

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
