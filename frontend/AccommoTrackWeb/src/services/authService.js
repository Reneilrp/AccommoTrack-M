import api, {
  applyTokenAuthPayload,
  clearStoredTokenAuth,
  clearPersistedAuthMode,
  initCsrfCookie,
  setTrustedDevicePreference,
  setPersistedAuthMode,
  TRUSTED_DEVICE_HEADER,
  shouldUseBearerForRequest,
} from "../utils/api";

const ensureCsrfCookieOrFallback = async () => {
  try {
    await initCsrfCookie();
  } catch (error) {
    if (!shouldUseBearerForRequest()) {
      throw error;
    }
  }
};

export const authService = {
  async register(name, email, password, password_confirmation) {
    await ensureCsrfCookieOrFallback();

    const response = await api.post("/register", {
      name,
      email,
      password,
      password_confirmation,
    });
    if (response.data.user) {
      localStorage.setItem("userData", JSON.stringify(response.data.user));
    }
    const responseAuthMode =
      response.data?.auth_mode || (response.data?.token ? "token" : "cookie");
    setPersistedAuthMode(responseAuthMode);

    if (responseAuthMode === "token") {
      applyTokenAuthPayload(response.data);
    } else {
      clearStoredTokenAuth();
    }
    return response.data;
  },

  async login(email, password, options = {}) {
    await ensureCsrfCookieOrFallback();

    const rememberDevice = Boolean(options?.rememberDevice);

    const response = await api.post("/login", {
      email: (email || "").trim(),
      password,
    }, {
      headers: {
        [TRUSTED_DEVICE_HEADER]: rememberDevice ? "true" : "false",
      },
    });
    if (response.data.user) {
      localStorage.setItem("userData", JSON.stringify(response.data.user));
    }
    const responseAuthMode =
      response.data?.auth_mode || (response.data?.token ? "token" : "cookie");
    setPersistedAuthMode(responseAuthMode);

    if (responseAuthMode === "token") {
      applyTokenAuthPayload(response.data);
    } else {
      clearStoredTokenAuth();
    }

    setTrustedDevicePreference(rememberDevice);
    return response.data;
  },

  async logout() {
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      await api.post("/logout", refreshToken ? { refresh_token: refreshToken } : {});
    } finally {
      localStorage.removeItem("userData");
      clearStoredTokenAuth();
      clearPersistedAuthMode();
    }
  },

  getCurrentUser() {
    const user = localStorage.getItem("userData");
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem("userData");
  },

  async forgotPassword(email) {
    const response = await api.post("/forgot-password", { email });
    return response.data;
  },

  async verifyCode(email, code) {
    const response = await api.post("/verify-code", { email, code });
    return response.data;
  },

  async resetPassword(email, code, password, password_confirmation) {
    const response = await api.post("/reset-password", {
      email,
      code,
      password,
      password_confirmation,
    });
    return response.data;
  },

  async switchRole(role, payload = {}) {
    await ensureCsrfCookieOrFallback();

    const response = await api.post("/switch-role", { role, ...payload });
    if (response.data.user) {
      localStorage.setItem("userData", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async checkEmail(email, signal) {
    const response = await api.get('/check-email', { params: { email }, signal });
    return response.data;
  },

  async getValidIdTypes() {
    const response = await api.get('/valid-id-types');
    return response.data;
  },
};
