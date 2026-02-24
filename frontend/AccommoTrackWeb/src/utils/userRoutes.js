export function getDefaultLandingRoute(user) {
  if (!user) {
    return '/login';
  }

  if (user.role === 'admin') {
    return '/admin';
  }

  if (user.role === 'caretaker') {
    return '/dashboard';
  }

  return '/dashboard';
}
