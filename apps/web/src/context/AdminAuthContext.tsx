import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

interface AdminUser {
    admin_id: string;
    email: string;
    role: string;
    name: string;
}

interface AdminAuthContextType {
    admin: AdminUser | null;
    isLoading: boolean;
    login: (credentials: any) => Promise<void>;
    logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType>({} as any);

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
        if (isPublicAdminPath()) {
            setAdmin(null);
            setIsLoading(false);
            return;
        }

        try {
            const res = await api.get('/api/v1/admin/auth/me');
            if (res.data.authenticated) {
                setAdmin(res.data.admin);
            } else {
                setAdmin(null);
            }
        } catch (err) {
            setAdmin(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (credentials: any) => {
        const res = await api.post('/api/v1/admin/auth/login', credentials);
        setAdmin(res.data.admin);
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

export const useAdminAuth = () => useContext(AdminAuthContext);
