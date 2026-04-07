import fs from 'fs';
import path from 'path';

const tenantNavigatorPath = path.resolve(
  __dirname,
  '../Navigation/TenantNavigator.jsx',
);
const tenantLayoutPath = path.resolve(
  __dirname,
  '../components/Layout/TenantLayout.jsx',
);
const tenantSupportPath = path.resolve(
  __dirname,
  '../screens/Tenant/TenantSupport.jsx',
);

const readSource = (filePath) => fs.readFileSync(filePath, 'utf8');

const normalizeRoutePath = (rawPath) => {
  if (!rawPath) return '';
  if (rawPath === '*') return '*';
  return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
};

const extractRoutePaths = (source) => (
  Array.from(
    source.matchAll(/<Route\s+path="([^"]+)"/g),
    (match) => normalizeRoutePath(match[1]),
  )
);

const extractSidebarMenuPaths = (source) => {
  const menuSectionMatch = source.match(/const tenantMenu = \[(.|\n|\r)*?\n\s*\];/);
  const menuSection = menuSectionMatch ? menuSectionMatch[0] : '';
  return Array.from(menuSection.matchAll(/path:\s*'([^']+)'/g), (match) => match[1]);
};

describe('Web tenant screens smoke coverage', () => {
  it('registers all expected tenant routes', () => {
    const source = readSource(tenantNavigatorPath);
    const routePaths = extractRoutePaths(source);

    const expectedTenantRoutes = [
      '/dashboard',
      '/explore',
      '/property/:id',
      '/bookings',
      '/payments',
      '/maintenance',
      '/checkout/:id',
      '/messages',
      '/settings',
      '/notifications',
      '/addons',
      '/reviews',
      '/verification',
    ];

    expectedTenantRoutes.forEach((routePath) => {
      expect(routePaths).toContain(routePath);
    });
  });

  it('maps sidebar tenant menu targets to valid tenant routes', () => {
    const navigatorSource = readSource(tenantNavigatorPath);
    const layoutSource = readSource(tenantLayoutPath);

    const routePaths = new Set(extractRoutePaths(navigatorSource));
    const menuPaths = extractSidebarMenuPaths(layoutSource);

    menuPaths.forEach((menuPath) => {
      expect(routePaths.has(menuPath)).toBe(true);
    });
  });

  it('keeps tenant support wired to faq service and official support email', () => {
    const source = readSource(tenantSupportPath);

    expect(source.includes('helpService.getFAQs')).toBe(true);
    expect(source.includes('support@accommotrack.com')).toBe(true);
  });
});
