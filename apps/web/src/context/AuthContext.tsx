import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
    id: string;
    role: 'MEMBER' | 'STAFF' | 'ADMIN';
    vendorId: string;
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
                const decoded: any = jwtDecode(token);
                // Determine role based on payload structure
                let role: 'MEMBER' | 'STAFF' | 'ADMIN' = 'MEMBER';
                let id = decoded.sub; // Standard subject

                if (decoded.staff_id) {
                    role = 'STAFF';
                    id = decoded.staff_id;
                } else if (decoded.member_id) {
                    role = 'MEMBER';
                    id = decoded.member_id;
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
