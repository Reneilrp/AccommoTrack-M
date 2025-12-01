export function getDefaultLandingRoute(user) {
  if (!user) {
    return '/login';
  }

  if (user.role === 'admin') {
    return '/admin';
  }

  if (user.role === 'caretaker') {
    const permissions = user.caretaker_permissions || {};
    if (permissions.bookings) return '/bookings';
    if (permissions.tenants) return '/tenants';
    if (permissions.messages) return '/messages';
    return '/settings';
  }

  return '/dashboard';
}
