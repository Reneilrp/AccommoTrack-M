import fs from 'fs';
import path from 'path';

const tenantNavigatorPath = path.resolve(
  __dirname,
  '../features/tenant/navigation/TenantNavigator.jsx',
);
const tenantBottomNavPath = path.resolve(
  __dirname,
  '../features/tenant/components/BottomNavigation.jsx',
);
const tenantMenuModalPath = path.resolve(
  __dirname,
  '../features/tenant/screens/Explore/TenantMenuModal.jsx',
);
const bookingDetailsPath = path.resolve(
  __dirname,
  '../features/tenant/screens/Bookings/BookingDetails.jsx',
);
const helpSupportPath = path.resolve(
  __dirname,
  '../features/tenant/screens/Support/HelpSupport.jsx',
);

const readSource = (filePath) => fs.readFileSync(filePath, 'utf8');

const extractStackScreenNames = (source) => (
  Array.from(source.matchAll(/<MainStack\.Screen\s+name="([^"]+)"/g), (match) => match[1])
);

const extractTabsSectionNames = (source) => {
  const tabsSectionMatch = source.match(/const tabs = \[(.|\n|\r)*?\n\s*\];/);
  const tabsSection = tabsSectionMatch ? tabsSectionMatch[0] : '';
  return Array.from(tabsSection.matchAll(/id:\s*'([^']+)'/g), (match) => match[1]);
};

describe('Mobile tenant screens smoke coverage', () => {
  it('registers all expected tenant stack screens', () => {
    const source = readSource(tenantNavigatorPath);
    const stackScreens = extractStackScreenNames(source);

    const expectedScreens = [
      'TenantHome',
      'Dashboard',
      'MyBookings',
      'BookingDetails',
      'Payments',
      'Messages',
      'Settings',
      'HelpSupport',
      'Notifications',
      'ServiceRequests',
      'CreateMaintenanceRequest',
      'Addons',
      'MyMaintenanceRequests',
      'MyReviews',
      'LeaveReview',
      'VerificationStatus',
    ];

    expectedScreens.forEach((screenName) => {
      expect(stackScreens).toContain(screenName);
    });
  });

  it('keeps tenant bottom tabs and menu actions for core navigation', () => {
    const bottomNavSource = readSource(tenantBottomNavPath);
    const menuModalSource = readSource(tenantMenuModalPath);

    const tabNames = extractTabsSectionNames(bottomNavSource);
    expect(tabNames).toEqual(
      expect.arrayContaining(['Explore', 'Dashboard', 'Bookings', 'Messages', 'Settings']),
    );

    const expectedMenuTargets = ['Dashboard', 'MyBookings', 'ServiceRequests', 'Payments', 'HelpSupport', 'Settings'];
    expectedMenuTargets.forEach((target) => {
      expect(menuModalSource.includes(`rootNavigate('${target}')`)).toBe(true);
    });
  });

  it('wires booking details request actions to real flows', () => {
    const source = readSource(bookingDetailsPath);

    expect(source.includes("navigate('ServiceRequests'")).toBe(true);
    expect(source.includes("initialTab: 'Maintenance'")).toBe(true);
    expect(source.includes("initialTab: 'Add-ons'")).toBe(true);
    expect(source.includes('Form will go here')).toBe(false);
  });

  it('keeps tenant support aligned with faq service and official support email', () => {
    const source = readSource(helpSupportPath);

    expect(source.includes('helpService.getFAQs')).toBe(true);
    expect(source.includes('support@accommotrack.com')).toBe(true);
  });
});
