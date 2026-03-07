import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { perfLog, startPerf } from '../utils/perf';
import { AdminAuthContext, AdminUser } from './adminAuthShared';

/** Paths that do not require an auth check and should show immediately (no loading flash). */
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];

function isPublicAdminPath(): boolean {
    if (typeof window === 'undefined') return false;
    return PUBLIC_ADMIN_PATHS.includes(window.location.pathname);
}

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [admin, setAdmin] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(() => !isPublicAdminPath());

    const checkAuth = async () => {
        const finishCheckAuth = startPerf('admin-auth', 'checkAuth', { pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown' });

        if (isPublicAdminPath()) {
            setAdmin(null);
            setIsLoading(false);
            finishCheckAuth({ publicPath: true, authenticated: false });
            return;
        }

        try {
            const res = await api.get('/api/v1/admin/auth/me');
            if (res.data.authenticated) {
                setAdmin(res.data.admin);
                finishCheckAuth({ publicPath: false, authenticated: true });
            } else {
                setAdmin(null);
                finishCheckAuth({ publicPath: false, authenticated: false });
            }
        } catch (err) {
            setAdmin(null);
            perfLog('admin-auth', 'checkAuth failed', err);
            finishCheckAuth({ publicPath: false, authenticated: false, error: true });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        perfLog('admin-auth', 'provider mounted', { publicPath: isPublicAdminPath() });
        checkAuth();
    }, []);

    const login = async (credentials: { email: string; password: string }) => {
        const finishLogin = startPerf('admin-auth', 'login', { email: credentials?.email });
        const res = await api.post('/api/v1/admin/auth/login', credentials);
        setAdmin(res.data.admin);
        finishLogin({ authenticated: true, adminId: res.data.admin?.admin_id });
    };

    const logout = async () => {
        await api.post('/api/v1/admin/auth/logout');
        setAdmin(null);
        window.location.href = '/admin/login';
    };

    return (
        <AdminAuthContext.Provider value={{ admin, isLoading, login, logout }}>
            {children}
        </AdminAuthContext.Provider>
    );
};
