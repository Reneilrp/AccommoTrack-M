import api from '../utils/api';

export const authService = {
    async register(name, email, password, password_confirmation) {
        const response = await api.post('/register', {
            name,
            email,
            password,
            password_confirmation
        });
        if (response.data.user) {
            localStorage.setItem('userData', JSON.stringify(response.data.user));
        }
        
        return response.data;
    },

    async login(email, password) {
        const response = await api.post('/login', {
            email,
            password
        });
        if (response.data.user) {
            localStorage.setItem('userData', JSON.stringify(response.data.user));
        }
        
        return response.data;
    },

    async logout() {
        try {
            await api.post('/logout');
        } finally {
            localStorage.removeItem('userData');
        }
    },

    getCurrentUser() {
        const user = localStorage.getItem('userData');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated() {
        return !!localStorage.getItem('userData');
    },

    async forgotPassword(email) {
        const response = await api.post('/forgot-password', { email });
        return response.data;
    },

    async verifyCode(email, code) {
        const response = await api.post('/verify-code', { email, code });
        return response.data;
    },

    async resetPassword(email, code, password, password_confirmation) {
        const response = await api.post('/reset-password', {
            email,
            code,
            password,
            password_confirmation
        });
        return response.data;
    }
};