import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import AdminButton from '../components/admin/ui/AdminButton';
import AdminInput from '../components/admin/ui/AdminInput';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { persistRecentVendorSlug } from '../utils/vendorPortalStorage';

type VendorLoginResponse = {
    token: string;
    vendor: {
        vendor_slug: string;
        onboarding_status: string;
    };
};

const apiErrorMessage = (err: unknown, fallback: string): string => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { message?: unknown } } }).response;
        if (typeof response?.data?.message === 'string') return response.data.message;
    }
    return fallback;
};

const VendorAdminLogin: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await api.post<VendorLoginResponse>('/api/v1/vendor/auth/login', {
                email,
                password
            });
            login(res.data.token);
            persistRecentVendorSlug(res.data.vendor.vendor_slug);
            const next = res.data.vendor.onboarding_status === 'COMPLETE' ? 'dashboard' : 'onboarding';
            navigate(`/v/${res.data.vendor.vendor_slug}/admin/${next}`);
        } catch (err: unknown) {
            setError(apiErrorMessage(err, 'Could not sign in with those details.'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            title="Vendor Admin Login"
            subtitle="Owners and managers sign in with email and password. Counter staff use the staff PIN login."
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {error && (
                    <div style={{
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: 'var(--danger)',
                        borderRadius: 'var(--radius)',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <AdminInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                />
                <AdminInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                />

                <AdminButton type="submit" isLoading={isLoading} fullWidth>
                    Sign In
                </AdminButton>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px' }}>
                    <Link to="/vendor/register" style={{ color: 'var(--primary)' }}>Create vendor account</Link>
                    <Link to="/vendor/admin/forgot-password" style={{ color: 'var(--text-secondary)' }}>Forgot password?</Link>
                </div>

                <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Staff member? <Link to="/vendor/login" style={{ color: 'var(--primary)' }}>Use staff portal</Link>
                </div>
            </form>
        </AuthShell>
    );
};

export default VendorAdminLogin;
