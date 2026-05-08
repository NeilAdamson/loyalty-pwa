import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
    id: string;
    role: 'MEMBER' | 'STAFF' | 'STAMPER' | 'ADMIN';
    vendorId: string;
}

interface AuthTokenPayload {
    sub?: string;
    role?: 'MEMBER' | 'STAFF' | 'STAMPER' | 'ADMIN';
    vendor_id?: string;
    staff_id?: string;
    vendor_admin_id?: string;
    member_id?: string;
}

interface AuthContextType {
    token: string | null;
    user: User | null;
    login: (token: string) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode<AuthTokenPayload>(token);
                // Determine role based on payload structure
                let role: 'MEMBER' | 'STAFF' | 'STAMPER' | 'ADMIN' = decoded.role || 'MEMBER';
                let id = decoded.sub || ''; // Standard subject

                if (decoded.staff_id) {
                    if (!role) role = 'STAFF'; // Fallback
                    id = decoded.staff_id;
                } else if (decoded.vendor_admin_id) {
                    role = 'ADMIN';
                    id = decoded.vendor_admin_id;
                } else if (decoded.member_id) {
                    if (!role) role = 'MEMBER';
                    id = decoded.member_id;
                }

                if (!id || !decoded.vendor_id) {
                    throw new Error('Token missing required identity fields');
                }

                setUser({
                    id,
                    role,
                    vendorId: decoded.vendor_id
                });
                localStorage.setItem('token', token);
            } catch (e) {
                console.error("Invalid Token", e);
                logout();
            }
        } else {
            localStorage.removeItem('token');
            setUser(null);
        }
        setIsLoading(false);
    }, [token]);

    const login = (newToken: string) => {
        setToken(newToken);
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
