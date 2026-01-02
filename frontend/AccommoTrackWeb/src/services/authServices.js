import api from './api';

export const authService = {
    async register(name, email, password, password_confirmation) {
        const response = await api.post('/register', {
            name,
            email,
            password,
            password_confirmation
        });
        
        if (response.data.token) {
            localStorage.setItem('auth_token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        return response.data;
    },

    async login(email, password) {
        const response = await api.post('/login', {
            email,
            password
        });
        
        if (response.data.token) {
            localStorage.setItem('auth_token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        return response.data;
    },

    async logout() {
        try {
            await api.post('/logout');
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
        }
    },

    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    isAuthenticated() {
        return !!localStorage.getItem('auth_token');
    }
};