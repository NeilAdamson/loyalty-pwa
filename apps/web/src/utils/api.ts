import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { perfLog } from './perf';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for Admin Cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

type TimedRequestConfig = InternalAxiosRequestConfig & {
    metadata?: {
        startedAt: number;
    };
};

// Auto-inject token
api.interceptors.request.use((config) => {
    const timedConfig = config as TimedRequestConfig;
    timedConfig.metadata = { startedAt: performance.now() };

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

    perfLog('http', 'request started', {
        method: timedConfig.method?.toUpperCase(),
        url: timedConfig.url
    });

    return config;
});

// Handle 401 (Optional: Auto-logout)
api.interceptors.response.use(
    (response) => {
        const timedConfig = response.config as TimedRequestConfig;
        const startedAt = timedConfig.metadata?.startedAt;
        perfLog('http', 'request finished', {
            method: timedConfig.method?.toUpperCase(),
            url: timedConfig.url,
            status: response.status,
            durationMs: typeof startedAt === 'number' ? Number((performance.now() - startedAt).toFixed(1)) : undefined
        });

        return response;
    },
    (error: AxiosError) => {
        const timedConfig = error.config as TimedRequestConfig | undefined;
        const startedAt = timedConfig?.metadata?.startedAt;
        perfLog('http', 'request failed', {
            method: timedConfig?.method?.toUpperCase(),
            url: timedConfig?.url,
            status: error.response?.status,
            durationMs: typeof startedAt === 'number' ? Number((performance.now() - startedAt).toFixed(1)) : undefined
        });

        if (error.response?.status === 401) {
            // localStorage.removeItem('token'); // Optional: Clear on 401
            // window.location.href = '/login'; // Optional: Redirect
        }
        return Promise.reject(error);
    }
);
