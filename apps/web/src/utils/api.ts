import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for Admin Cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auto-inject token
api.interceptors.request.use((config) => {
    // Platform admin routes (/admin/*) use cookies, not Bearer tokens
    // Vendor admin routes (/v/:slug/admin/*) use Bearer tokens
    // Member/Staff routes also use Bearer tokens
    const isPlatformAdminRoute = config.url?.startsWith('/admin') || config.url?.includes('/api/v1/admin');
    if (!isPlatformAdminRoute) {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Handle 401 (Optional: Auto-logout)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // localStorage.removeItem('token'); // Optional: Clear on 401
            // window.location.href = '/login'; // Optional: Redirect
        }
        return Promise.reject(error);
    }
);
