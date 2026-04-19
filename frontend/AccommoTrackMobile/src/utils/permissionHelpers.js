import { MODULE_GROUPS } from './caretakerPermissions.js';

/**
 * Normalizes permission values from various formats (string, boolean, etc.)
 */
export const normalizePermissionValue = (value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'allowed';
  }
  return Boolean(value);
};

/**
 * Builds a list of candidate permission keys for a given key.
 * Strictly checks for the key itself and its can_view/can_manage variants.
 */
export const buildPermissionCandidates = (key, aliases = []) => {
  const base = String(key || '').trim().toLowerCase();
  
  // Start with standard prefixes
  const expanded = [base, `can_view_${base}`, `can_manage_${base}`];
  
  // Add aliases
  aliases.forEach(alias => {
    const a = alias.toLowerCase();
    expanded.push(a, `can_view_${a}`, `can_manage_${a}`);
  });

  // Singular/Plural variants for common terms
  const singular = base.endsWith('ies') ? base.slice(0, -3) + 'y' : (base.endsWith('s') ? base.slice(0, -1) : base);
  const plural = base.endsWith('s') ? base : (singular === 'property' ? 'properties' : singular + 's');
  
  [singular, plural].forEach(variant => {
    if (variant !== base) {
      expanded.push(variant, `can_view_${variant}`, `can_manage_${variant}`);
    }
  });

  return [...new Set(expanded)]; // De-duplicate
};

/**
 * Checks if the user has a specific permission or any of its aliases.
 * This is used for specific ACTION gating (e.g. "approve_bookings").
 */
export const hasPermission = (permissions, isCaretaker, key, aliases = []) => {
  if (!isCaretaker) return true;
  if (!permissions) return false;

  const candidates = buildPermissionCandidates(key, aliases);
  return candidates.some((candidate) =>
    normalizePermissionValue(permissions?.[candidate])
  );
};

/**
 * Broad check to see if a user can access a module (Tab/Navigator).
 * Returns true if the user has ANY permission related to the module group.
 */
export const canAccessModule = (permissions, isCaretaker, moduleSlug) => {
  if (!isCaretaker) return true;
  if (!permissions) return false;

  const slug = String(moduleSlug || '').toLowerCase();

  // Find the group related to this slug
  const matchedGroup = MODULE_GROUPS.find(g => 
    g.title.toLowerCase().includes(slug) || 
    slug.includes(g.title.toLowerCase())
  );

  if (!matchedGroup) {
    // Fallback to strict check if no group found
    return hasPermission(permissions, isCaretaker, moduleSlug);
  }

  // Check if ANY key in the group is granted
  return matchedGroup.keys.some(k => hasPermission(permissions, isCaretaker, k));
};
