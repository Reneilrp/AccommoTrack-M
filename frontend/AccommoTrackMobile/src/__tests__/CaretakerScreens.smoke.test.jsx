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
const dashboardPath = path.resolve(
  __dirname,
  '../features/landlord/screens/Dashboard/DashboardPage.jsx',
);

const readSource = (filePath) => fs.readFileSync(filePath, 'utf8');

const extractStackScreenNames = (source) => (
  Array.from(source.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g), (match) => match[1])
);

const extractMajorQuickActionsSection = (source) => {
  const match = source.match(/const majorQuickActions = \[(.|\n|\r)*?\n\s*\];/);
  return match ? match[0] : '';
};

const countMajorQuickActions = (section) => (
  Array.from(section.matchAll(/\bid:\s*\d+/g)).length
);

describe('Caretaker screens smoke coverage', () => {
  it('keeps caretaker permission checks in landlord navigator', () => {
    const source = readSource(landlordNavigatorPath);

    expect(source).toContain("const isCaretaker = userRole === 'caretaker'");
    expect(source).toContain('const hasPermission = React.useCallback');
    expect(source).toContain('const buildPermissionCandidates = React.useCallback');
    expect(source).toContain('expanded.push(entry, `can_view_${entry}`, `can_manage_${entry}`)');

    expect(source).toContain("const canAccessRooms = hasPermission('rooms')");
    expect(source).toContain("const canAccessMaintenance = hasPermission('maintenance')");
    expect(source).toContain("const canAccessBookings = hasPermission('bookings')");
    expect(source).toContain("const canAccessTenants = hasPermission('tenants')");
    expect(source).toContain("const canAccessMessages = hasPermission('messages')");
    expect(source).toContain("const canAccessPayments = !isCaretaker || hasPermission('payments')");
    expect(source).toContain("const canAccessAnalytics = !isCaretaker || hasPermission('analytics')");
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
    expect(source).toContain("show: !isCaretaker || hasPermission('properties', ['property', 'property_management'])");
    expect(source).toContain("show: !isCaretaker || hasPermission('bookings')");
    expect(source).toContain("show: !isCaretaker || hasPermission('messages')");
    expect(source).toContain("show: true, // Settings always visible");
    expect(source).toContain('const homeComponent = isCaretaker ? CaretakerDashboard : LandlordDashboard');
  });

  it('keeps six quick actions visible and guards restricted caretaker taps with a permission modal', () => {
    const source = readSource(dashboardPath);
    const majorQuickActionsSection = extractMajorQuickActionsSection(source);

    expect(countMajorQuickActions(majorQuickActionsSection)).toBe(6);
    expect(majorQuickActionsSection).toContain("title: 'Properties'");
    expect(majorQuickActionsSection).toContain("title: 'Rooms'");
    expect(majorQuickActionsSection).toContain("title: 'Tenants'");
    expect(majorQuickActionsSection).toContain("title: 'Bookings'");
    expect(majorQuickActionsSection).toContain("title: 'Payments'");
    expect(majorQuickActionsSection).toContain("title: 'Analytics'");
    expect(majorQuickActionsSection).toContain("requiredPermission: { key: 'analytics' }");

    expect(source).toContain('const allQuickActions = [...majorQuickActions, ...minorQuickActions.filter((action) => action.show)];');
    expect(source).toContain('const visibleQuickActions = allQuickActions.slice(0, 8);');
    expect(source).toContain('const quickActionsToRender = visibleQuickActions;');
    expect(source).toContain('const openPermissionModal = useCallback((actionTitle) => {');
    expect(source).toContain('const canAccessNamedModule = useCallback((moduleKey) => {');
    expect(source).toContain('const hasQuickActionAccess = useCallback((action) => {');
    expect(source).toContain('if (!hasQuickActionAccess(action)) {');
    expect(source).toContain("openPermissionModal(action?.title || 'this module');");
    expect(source).toContain("if (!ensureActivityAccess('properties', 'Properties')) return;");
    expect(source).toContain("openPermissionModal('Notifications');");
    expect(source).toContain('Permission Required');
    expect(source).toContain('You do not have permission to access');
  });
});
