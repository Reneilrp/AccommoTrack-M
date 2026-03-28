import api, { initCsrfCookie, SHOULD_USE_BEARER_AUTH } from "../utils/api";

export const authService = {
  async register(name, email, password, password_confirmation) {
    try {
      await initCsrfCookie();
    } catch {
      // Token mode fallback (local/testing) does not require CSRF cookie.
    }

    const response = await api.post("/register", {
      name,
      email,
      password,
      password_confirmation,
    });
    if (response.data.user) {
      localStorage.setItem("userData", JSON.stringify(response.data.user));
    }
    if (response.data.token && SHOULD_USE_BEARER_AUTH) {
      localStorage.setItem("authToken", response.data.token);
      api.defaults.headers.common["Authorization"] =
        `Bearer ${response.data.token}`;
    } else {
      localStorage.removeItem("authToken");
      delete api.defaults.headers.common["Authorization"];
    }
    return response.data;
  },

  async login(email, password) {
    try {
      await initCsrfCookie();
    } catch {
      // Token mode fallback (local/testing) does not require CSRF cookie.
    }

    const response = await api.post("/login", {
      email: (email || "").trim(),
      password,
    });
    if (response.data.user) {
      localStorage.setItem("userData", JSON.stringify(response.data.user));
    }
    if (response.data.token && SHOULD_USE_BEARER_AUTH) {
      localStorage.setItem("authToken", response.data.token);
      api.defaults.headers.common["Authorization"] =
        `Bearer ${response.data.token}`;
    } else {
      localStorage.removeItem("authToken");
      delete api.defaults.headers.common["Authorization"];
    }
    return response.data;
  },

  async logout() {
    try {
      await api.post("/logout");
    } finally {
      localStorage.removeItem("userData");
      localStorage.removeItem("authToken");
      delete api.defaults.headers.common["Authorization"];
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

  async switchRole(role) {
    const response = await api.post("/switch-role", { role });
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
