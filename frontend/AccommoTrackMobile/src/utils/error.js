/**
 * Utility function to extract a human-readable error message from an API error response.
 * Handles Axios error objects and generic error messages.
 * 
 * @param {any} error - The error object to extract a message from
 * @returns {string} - The extracted error message
 */
export const extractErrorMessage = (error) => {
    if (!error) return "An unknown error occurred.";

    // If it's a string, return it directly
    if (typeof error === 'string') return error;

    // Check for Axios-style response error
    if (error.response) {
        // Validation errors (422)
        if (error.response.status === 422 && error.response.data?.errors) {
            const firstError = Object.values(error.response.data.errors)[0];
            return Array.isArray(firstError) ? firstError[0] : firstError;
        }

        // Generic API message
        if (error.response.data?.message) {
            return error.response.data.message;
        }

        // Status code fallback
        if (error.response.statusText) {
            return `Error ${error.response.status}: ${error.response.statusText}`;
        }

        return `Server error (${error.response.status})`;
    }

    // Check for request failure (no response)
    if (error.request) {
        return "Network error: Unable to reach the server. Please check your connection.";
    }

    // Generic error message
    return error.message || "An unexpected error occurred.";
};

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

/**
 * Normalize API/transport errors into actionable user-facing copy.
 * Keeps domain-specific backend messages intact and only rewrites low-signal failures.
 *
 * @param {any} errorOrMessage
 * @param {string} fallbackMessage
 * @returns {string}
 */
export const normalizeActionError = (
    errorOrMessage,
    fallbackMessage = "Unable to complete your request right now. Please try again.",
) => {
    const rawMessage = normalizeWhitespace(
        typeof errorOrMessage === 'string'
            ? errorOrMessage
            : extractErrorMessage(errorOrMessage),
    );

    if (!rawMessage) {
        return fallbackMessage;
    }

    if (/(network error|failed to fetch|unable to reach the server|timeout|timed out|connection refused|socket hang up|internet)/i.test(rawMessage)) {
        return "Network error. Check your internet connection and try again.";
    }

    if (/(unauthenticated|unauthorized|forbidden|permission|not allowed|access denied|\b401\b|\b403\b)/i.test(rawMessage)) {
        return "You do not have permission to perform this action.";
    }

    if (/(session expired|csrf token|invalid token|please login|please log in)/i.test(rawMessage)) {
        return "Your session may have expired. Please sign in again.";
    }

    if (/(server error|internal server|\b500\b|service unavailable|\b503\b)/i.test(rawMessage)) {
        return "Server error. Please try again in a moment.";
    }

    return rawMessage;
};
