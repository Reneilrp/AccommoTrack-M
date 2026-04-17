/**
 * useCaretakerPermissions
 *
 * Single source of truth for caretaker RBAC on the web.
 * Previously duplicated verbatim in both LandlordLayout and LandlordNavigator.
 *
 * @param {object} user - The authenticated user object (user.caretaker_permissions)
 * @returns {object} A flat permission map + a fullAccess boolean flag
 */
export function useCaretakerPermissions(user) {
  const caretakerPermissions = user?.caretaker_permissions || {};
  const isCaretaker = user?.role === 'caretaker';

  const normalizePermissionValue = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return (
        normalized === '1' ||
        normalized === 'true' ||
        normalized === 'yes' ||
        normalized === 'allowed'
      );
    }
    return Boolean(value);
  };

  const buildPermissionCandidates = (key, aliases = []) => {
    const base = String(key || '').trim();
    const singular = base.endsWith('ies')
      ? `${base.slice(0, -3)}y`
      : base.endsWith('s')
        ? base.slice(0, -1)
        : base;
    const plural = base.endsWith('s')
      ? base
      : singular === 'property'
        ? 'properties'
        : `${singular}s`;

    const keys = new Set([base, singular, plural, ...aliases]);
    const expanded = [];

    keys.forEach((entry) => {
      if (!entry) return;
      expanded.push(entry, `can_view_${entry}`, `can_manage_${entry}`);
    });

    return expanded;
  };

  /**
   * Check whether the caretaker has a specific permission.
   * When called for a non-caretaker user this always returns true
   * so that landlord contexts can safely import the hook as a pass-through.
   */
  const hasPermission = (key, aliases = []) => {
    if (!isCaretaker) return true;
    return buildPermissionCandidates(key, aliases).some((candidate) =>
      normalizePermissionValue(caretakerPermissions?.[candidate]),
    );
  };

  const canManageProperties = hasPermission('properties', ['property', 'property_management']);
  const canManageRooms = hasPermission('rooms');
  const canManageMaintenance = hasPermission('maintenance', ['rooms']);
  const canManageAddons = hasPermission('manage_add_ons', ['add_ons', 'addons']);
  const canManageBookings = hasPermission('bookings');
  const canManagePayments = hasPermission('payments');
  const canManageTenants = hasPermission('tenants');
  const canManageMessages = hasPermission('messages');
  const canManageAnalytics = hasPermission('analytics');

  // True when every core module permission is granted
  const fullAccess =
    canManageProperties &&
    canManageRooms &&
    canManageMaintenance &&
    canManageAddons &&
    canManageBookings &&
    canManagePayments &&
    canManageTenants &&
    canManageMessages &&
    canManageAnalytics;

  return {
    isCaretaker,
    hasPermission,
    canManageProperties,
    canManageRooms,
    canManageMaintenance,
    canManageAddons,
    canManageBookings,
    canManagePayments,
    canManageTenants,
    canManageMessages,
    canManageAnalytics,
    fullAccess,
  };
}
