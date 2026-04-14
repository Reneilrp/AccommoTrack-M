const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

export const extractErrorMessage = (error) => {
  if (!error) return '';
  if (typeof error === 'string') return normalizeWhitespace(error);

  return normalizeWhitespace(
    error?.response?.data?.message
      || error?.response?.data?.error
      || error?.message
      || '',
  );
};

export const normalizeActionError = (
  errorOrMessage,
  fallbackMessage = 'Unable to complete your request right now. Please try again.',
) => {
  const rawMessage = normalizeWhitespace(
    typeof errorOrMessage === 'string'
      ? errorOrMessage
      : extractErrorMessage(errorOrMessage),
  );

  if (!rawMessage) return fallbackMessage;

  if (/(network error|failed to fetch|unable to reach the server|timeout|timed out|connection refused|socket hang up|internet)/i.test(rawMessage)) {
    return 'Network error. Check your internet connection and try again.';
  }

  if (/(unauthenticated|unauthorized|forbidden|permission|not allowed|access denied|\b401\b|\b403\b)/i.test(rawMessage)) {
    return 'You do not have permission to perform this action.';
  }

  if (/(session expired|csrf token|invalid token|please login|please log in)/i.test(rawMessage)) {
    return 'Your session may have expired. Please sign in again.';
  }

  if (/(server error|internal server|\b500\b|service unavailable|\b503\b)/i.test(rawMessage)) {
    return 'Server error. Please try again in a moment.';
  }

  return rawMessage;
};

export default normalizeActionError;
