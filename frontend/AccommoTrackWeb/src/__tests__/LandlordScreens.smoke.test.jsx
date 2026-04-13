import fs from 'fs';
import path from 'path';

const landlordNavigatorPath = path.resolve(
  __dirname,
  '../Navigation/LandlordNavigator.jsx',
);
const landlordLayoutPath = path.resolve(
  __dirname,
  '../components/Layout/LandlordLayout.jsx',
);
const dashboardPath = path.resolve(
  __dirname,
  '../screens/Landlord/DashboardPage.jsx',
);

const readSource = (filePath) => fs.readFileSync(filePath, 'utf8');

const normalizeRoutePath = (rawPath) => {
  if (!rawPath) return '';
  if (rawPath === '*') return '*';
  return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
};

const stripQueryAndInterpolation = (rawPath) => {
  const withoutTemplateInterpolation = rawPath.split('${')[0];
  const withoutQuery = withoutTemplateInterpolation.split('?')[0];
  return withoutQuery;
};

const extractRoutePaths = (source) => (
  Array.from(source.matchAll(/<Route\s+path="([^"]+)"/g), (match) => normalizeRoutePath(match[1]))
);

const extractSidebarMenuPaths = (source) => {
  const menuSectionMatch = source.match(/const landlordMenu = \[(.|\n|\r)*?\n\s*\];/);
  const menuSection = menuSectionMatch ? menuSectionMatch[0] : '';
  return Array.from(menuSection.matchAll(/path:\s*'([^']+)'/g), (match) => match[1]);
};

const extractDashboardTargets = (source) => {
  const linkTargets = Array.from(source.matchAll(/to="([^"]+)"/g), (match) => match[1]);

  const navigateTargets = Array.from(
    source.matchAll(/__navigate\((?:'([^']+)'|"([^"]+)"|`([^`]+)`)/g),
    (match) => match[1] || match[2] || match[3],
  );

  return [...linkTargets, ...navigateTargets]
    .map((target) => stripQueryAndInterpolation(target || ''))
    .filter(Boolean);
};

describe('Web landlord screens smoke coverage', () => {
  it('registers all expected landlord routes', () => {
    const source = readSource(landlordNavigatorPath);
    const routePaths = extractRoutePaths(source);

    const expectedLandlordRoutes = [
      '/dashboard',
      '/properties',
      '/properties/:id',
      '/properties/:id/edit',
      '/rooms',
      '/maintenance',
      '/tenants/:id',
      '/tenants/logs',
      '/payments',
      '/reviews',
      '/tenants',
      '/bookings',
      '/transfers',
      '/messages',
      '/addons',
      '/analytics',
      '/settings',
      '/verification',
      '/notifications',
    ];

    expectedLandlordRoutes.forEach((routePath) => {
      expect(routePaths).toContain(routePath);
    });
  });

  it('keeps caretaker route-gated screens declared in landlord navigator', () => {
    const source = readSource(landlordNavigatorPath);
    const routePaths = extractRoutePaths(source);

    const expectedCaretakerCapableRoutes = [
      '/dashboard',
      '/rooms',
      '/maintenance',
      '/bookings',
      '/payments',
      '/tenants',
      '/messages',
      '/settings',
      '/notifications',
    ];

    expectedCaretakerCapableRoutes.forEach((routePath) => {
      expect(routePaths).toContain(routePath);
    });

    expect(source.includes("user?.role === 'caretaker'")).toBe(true);
    expect(source.includes('caretakerPermissions')).toBe(true);
  });

  it('maps sidebar landlord menu targets to valid landlord routes', () => {
    const navigatorSource = readSource(landlordNavigatorPath);
    const layoutSource = readSource(landlordLayoutPath);

    const routePaths = new Set(extractRoutePaths(navigatorSource));
    const menuPaths = extractSidebarMenuPaths(layoutSource);

    menuPaths.forEach((menuPath) => {
      expect(routePaths.has(menuPath)).toBe(true);
    });
  });

  it('maps dashboard navigation targets to valid landlord routes', () => {
    const navigatorSource = readSource(landlordNavigatorPath);
    const dashboardSource = readSource(dashboardPath);

    const routePaths = new Set(extractRoutePaths(navigatorSource));
    const dashboardTargets = extractDashboardTargets(dashboardSource);

    dashboardTargets.forEach((targetPath) => {
      if (!targetPath.startsWith('/')) return;
      expect(routePaths.has(targetPath)).toBe(true);
    });
  });
});
