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

const readSource = (filePath) => fs.readFileSync(filePath, 'utf8');

const extractCaretakerBranch = (source) => {
  const startToken = "if (user?.role === 'caretaker') {";
  const endToken = '// Landlord routes';

  const startIndex = source.indexOf(startToken);
  const endIndex = source.indexOf(endToken);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return '';
  }

  return source.slice(startIndex, endIndex);
};

const extractCaretakerAllowedPathsBlock = (source) => {
  const match = source.match(/const caretakerAllowedPaths = new Set\(\[([\s\S]*?)\]\.filter\(Boolean\)\);/);
  return match ? match[1] : '';
};

describe('Web caretaker screens smoke coverage', () => {
  it('keeps alias-aware caretaker permission helpers in landlord navigator', () => {
    const source = readSource(landlordNavigatorPath);

    expect(source).toContain("if (user?.role === 'caretaker') {");
    expect(source).toContain('const normalizePermissionValue = (value) => {');
    expect(source).toContain('const buildPermissionCandidates = (key, aliases = []) => {');
    expect(source).toContain('expanded.push(entry, `can_view_${entry}`, `can_manage_${entry}`)');
    expect(source).toContain('const hasCaretakerPermission = (key, aliases = []) => {');

    expect(source).toContain("const canManageProperties = hasCaretakerPermission('properties', ['property', 'property_management'])");
    expect(source).toContain("const canManageRooms = hasCaretakerPermission('rooms')");
    expect(source).toContain("const canManageMaintenance = hasCaretakerPermission('maintenance', ['rooms'])");
    expect(source).toContain("const canManageBookings = hasCaretakerPermission('bookings')");
    expect(source).toContain("const canManagePayments = hasCaretakerPermission('payments')");
    expect(source).toContain("const canManageTenants = hasCaretakerPermission('tenants')");
    expect(source).toContain("const canManageMessages = hasCaretakerPermission('messages')");
    expect(source).toContain("const canManageAnalytics = hasCaretakerPermission('analytics')");
    expect(source).toContain("const canManageAddons = hasCaretakerPermission('manage_add_ons', ['add_ons', 'addons'])");
  });

  it('keeps caretaker route gating for allowed modules and hides landlord-only routes', () => {
    const source = readSource(landlordNavigatorPath);
    const caretakerBranch = extractCaretakerBranch(source);

    expect(caretakerBranch).toContain('{canManageProperties && (');
    expect(caretakerBranch).toContain('path="properties"');
    expect(caretakerBranch).toContain('{canManageRooms && (');
    expect(caretakerBranch).toContain('path="rooms"');
    expect(caretakerBranch).toContain('{canManageMaintenance && (');
    expect(caretakerBranch).toContain('path="maintenance"');
    expect(caretakerBranch).toContain('{canManageAddons && (');
    expect(caretakerBranch).toContain('path="addons"');
    expect(caretakerBranch).toContain('{canManageBookings && (');
    expect(caretakerBranch).toContain('path="bookings"');
    expect(caretakerBranch).toContain('{canManagePayments && (');
    expect(caretakerBranch).toContain('path="payments"');
    expect(caretakerBranch).toContain('{canManageTenants && (');
    expect(caretakerBranch).toContain('path="tenants"');
    expect(caretakerBranch).toContain('{canManageMessages && (');
    expect(caretakerBranch).toContain('path="messages"');
    expect(caretakerBranch).toContain('{canManageAnalytics && (');
    expect(caretakerBranch).toContain('path="analytics"');

    expect(caretakerBranch).toContain('path="settings"');
    expect(caretakerBranch).toContain('path="notifications"');
    expect(caretakerBranch).toContain('path="*" element={<Navigate to={caretakerHome} replace />}');

    expect(caretakerBranch).not.toContain('path="verification"');
  });

  it('keeps caretaker sidebar menu paths filtered by permissions in layout', () => {
    const source = readSource(landlordLayoutPath);
    const allowedPathsBlock = extractCaretakerAllowedPathsBlock(source);

    expect(source).toContain("const canManageProperties = hasCaretakerPermission('properties', ['property', 'property_management'])");
    expect(source).toContain("const canManageMaintenance = hasCaretakerPermission('maintenance', ['rooms'])");
    expect(source).toContain("const canManageAddons = hasCaretakerPermission('manage_add_ons', ['add_ons', 'addons'])");
    expect(source).toContain("const canManagePayments = hasCaretakerPermission('payments')");
    expect(source).toContain("const canManageAnalytics = hasCaretakerPermission('analytics')");
    expect(source).toContain('const caretakerMenu = caretakerAllowedPaths.size > 0');
    expect(source).toContain('const menuItems = isCaretaker');

    expect(allowedPathsBlock).toContain("'/dashboard'");
    expect(allowedPathsBlock).toContain("canManageProperties ? '/properties' : null");
    expect(allowedPathsBlock).toContain("hasCaretakerPermission('rooms') ? '/rooms' : null");
    expect(allowedPathsBlock).toContain("canManageMaintenance ? '/maintenance' : null");
    expect(allowedPathsBlock).toContain("canManageAddons ? '/addons' : null");
    expect(allowedPathsBlock).toContain("hasCaretakerPermission('bookings') ? '/bookings' : null");
    expect(allowedPathsBlock).toContain("canManagePayments ? '/payments' : null");
    expect(allowedPathsBlock).toContain("hasCaretakerPermission('tenants') ? '/tenants' : null");
    expect(allowedPathsBlock).toContain("canManageMessages ? '/messages' : null");
    expect(allowedPathsBlock).toContain("canManageAnalytics ? '/analytics' : null");
    expect(allowedPathsBlock).toContain("'/settings'");
  });
});
