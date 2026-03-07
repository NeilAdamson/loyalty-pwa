import { createContext } from 'react';

export interface AdminUser {
    admin_id: string;
    email: string;
    role: string;
    name: string;
}

export interface AdminAuthContextType {
    admin: AdminUser | null;
    isLoading: boolean;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);
