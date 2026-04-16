const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;

export const normalizeNameInput = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

export const validateProfileNameField = (value, { required = false, label = 'Name' } = {}) => {
  const normalized = normalizeNameInput(value);

  if (!normalized) {
    return required ? `${label} is required.` : '';
  }

  if (!NAME_PATTERN.test(normalized)) {
    return 'Only letters, spaces, hyphens and apostrophes are allowed.';
  }

  return '';
};

export const hasAnyValidationError = (errors = {}) =>
  Object.values(errors).some((message) => Boolean(message));
