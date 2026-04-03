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
