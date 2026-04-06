import fs from 'fs';
import path from 'path';

const landlordNavigatorPath = path.resolve(
  __dirname,
  '../features/landlord/navigation/LandlordNavigator.jsx',
);
const landlordBottomNavPath = path.resolve(
  __dirname,
  '../features/landlord/components/LandlordBottomNavigation.jsx',
);

const readSource = (filePath) => fs.readFileSync(filePath, 'utf8');

const extractStackScreenNames = (source) => (
  Array.from(source.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g), (match) => match[1])
);

describe('Caretaker screens smoke coverage', () => {
  it('keeps caretaker permission checks in landlord navigator', () => {
    const source = readSource(landlordNavigatorPath);

    expect(source).toContain("const isCaretaker = userRole === 'caretaker'");
    expect(source).toContain('const hasPermission = React.useCallback');
    expect(source).toContain("permissions?.[`can_view_${key}`]");
    expect(source).toContain("permissions?.[`can_manage_${key}`]");

    expect(source).toContain("const canAccessRooms = hasPermission('rooms')");
    expect(source).toContain("const canAccessMaintenance = hasPermission('maintenance')");
    expect(source).toContain("const canAccessBookings = hasPermission('bookings')");
    expect(source).toContain("const canAccessTenants = hasPermission('tenants')");
    expect(source).toContain("const canAccessMessages = hasPermission('messages')");
    expect(source).toContain("const canAccessPayments = !isCaretaker || hasPermission('payments')");
  });

  it('routes caretaker dashboard and gated stack screens correctly', () => {
    const source = readSource(landlordNavigatorPath);
    const stackScreens = extractStackScreenNames(source);

    expect(source).toContain('const dashboardComponent = isCaretaker ? CaretakerDashboard : LandlordDashboard');
    expect(source).toContain('name="DashboardPage" component={dashboardComponent}');
    expect(source).toContain('{isCaretaker && (');
    expect(source).toContain('name="CaretakerDashboard"');

    expect(source).toContain('{canAccessRooms && (');
    expect(source).toContain('name="RoomManagement"');

    expect(source).toContain('{canAccessMaintenance && (');
    expect(source).toContain('name="MaintenanceRequests"');

    expect(source).toContain('{canAccessTenants && (');
    expect(source).toContain('name="Tenants"');
    expect(source).toContain('name="TenantLogs"');
    expect(source).toContain('name="TransferRequests"');

    expect(source).toContain('{canAccessMessages && (');
    expect(source).toContain('name="Chat"');

    expect(source).toContain('{canAccessPayments && (');
    expect(source).toContain('name="Payments"');

    expect(stackScreens).toEqual(expect.arrayContaining([
      'DashboardPage',
      'CaretakerDashboard',
      'RoomManagement',
      'Tenants',
      'MaintenanceRequests',
      'Payments',
      'Chat',
      'Settings',
    ]));
  });

  it('keeps caretaker tab visibility rules in landlord bottom navigation', () => {
    const source = readSource(landlordBottomNavPath);

    expect(source).toContain("const isCaretaker = user?.role === 'caretaker'");
    expect(source).toContain("show: true, // Home always visible");
    expect(source).toContain("show: !isCaretaker || hasPermission('properties')");
    expect(source).toContain("show: !isCaretaker || hasPermission('bookings')");
    expect(source).toContain("show: !isCaretaker || hasPermission('messages')");
    expect(source).toContain("show: true, // Settings always visible");
    expect(source).toContain('const homeComponent = isCaretaker ? CaretakerDashboard : LandlordDashboard');
  });
});
