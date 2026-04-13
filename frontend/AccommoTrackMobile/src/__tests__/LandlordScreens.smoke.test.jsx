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
const propertySummaryPath = path.resolve(
  __dirname,
  '../features/landlord/screens/Properties/PropertySummary.jsx',
);

const readSource = (filePath) => fs.readFileSync(filePath, 'utf8');

const extractStackScreenNames = (source) => (
  Array.from(source.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g), (match) => match[1])
);

const extractTabsSectionNames = (source) => {
  const tabsSectionMatch = source.match(/const tabs = \[(.|\n|\r)*?\n\s*\];/);
  const tabsSection = tabsSectionMatch ? tabsSectionMatch[0] : '';
  return Array.from(tabsSection.matchAll(/name:\s*'([^']+)'/g), (match) => match[1]);
};

const extractQuickActionScreens = (source) => {
  const majorSectionMatch = source.match(/const majorQuickActions = \[(.|\n|\r)*?\n\s*\];/);
  const minorSectionMatch = source.match(/const minorQuickActions = \[(.|\n|\r)*?\n\s*\];/);

  const majorSection = majorSectionMatch ? majorSectionMatch[0] : '';
  const minorSection = minorSectionMatch ? minorSectionMatch[0] : '';

  return Array.from(
    `${majorSection}\n${minorSection}`.matchAll(/screen:\s*'([^']+)'/g),
    (match) => match[1],
  );
};

describe('Landlord screens smoke coverage', () => {
  it('registers all expected landlord stack screens', () => {
    const source = readSource(landlordNavigatorPath);
    const stackScreens = extractStackScreenNames(source);

    const expectedScreens = [
      'MainTabs',
      'MyProperties',
      'DashboardPage',
      'CaretakerDashboard',
      'Tenants',
      'RoomManagement',
      'Analytics',
      'MyProfile',
      'AddProperty',
      'PropertySummary',
      'DormProfileSettings',
      'PropertyDetails',
      'HelpSupport',
      'About',
      'DevTeam',
      'Notifications',
      'AllActivities',
      'AddonManagement',
      'AddBooking',
      'Payments',
      'VerificationStatus',
      'PropertyActivityLogs',
      'TenantLogs',
      'TransferRequests',
      'MaintenanceRequests',
      'Reviews',
      'UpdatePassword',
      'PropertyPaymentSettings',
      'ManualPaymentSettings',
      'SubscriptionPlan',
      'BillingCenter',
      'Caretakers',
      'Chat',
      'Settings',
    ];

    expectedScreens.forEach((screenName) => {
      expect(stackScreens).toContain(screenName);
    });
  });

  it('keeps landlord bottom tabs registered for core screens', () => {
    const source = readSource(landlordBottomNavPath);
    const tabNames = extractTabsSectionNames(source);

    expect(tabNames).toEqual(
      expect.arrayContaining(['Home', 'Properties', 'Bookings', 'Messages', 'Settings']),
    );
  });

  it('maps dashboard quick actions to valid landlord routes', () => {
    const stackSource = readSource(landlordNavigatorPath);
    const tabsSource = readSource(landlordBottomNavPath);
    const dashboardSource = readSource(dashboardPath);

    const stackScreens = extractStackScreenNames(stackSource);
    const tabNames = extractTabsSectionNames(tabsSource);
    const quickActionTargets = extractQuickActionScreens(dashboardSource);

    const reachableScreens = new Set([...stackScreens, ...tabNames]);

    quickActionTargets.forEach((target) => {
      expect(reachableScreens.has(target)).toBe(true);
    });
  });

  it('keeps PropertySummary payment activity drilldown params wired to Payments', () => {
    const source = readSource(propertySummaryPath);

    expect(source).toContain("if (item.type === 'payment') {");
    expect(source).toContain("navigation.navigate('Payments', {");
    expect(source).toContain("filter: 'overdue'");
    expect(source).toContain("searchQuery: propertyTitle || ''");
    expect(source).toContain('drilldownToken: Date.now()');
  });

  it('keeps PropertySummary booking activity drilldown wired to Bookings tab', () => {
    const source = readSource(propertySummaryPath);

    expect(source).toContain("if (item.type === 'booking') {");
    expect(source).toContain("navigation.navigate('MainTabs', {");
    expect(source).toContain("screen: 'Bookings'");
    expect(source).toContain("filter: 'pending'");
    expect(source).toContain('focusBookingId: item.id');
    expect(source).toContain('drilldownToken: Date.now()');
  });
});
