import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import AdminButton from '../components/admin/ui/AdminButton';
import AdminInput from '../components/admin/ui/AdminInput';
import { api } from '../utils/api';

const apiErrorMessage = (err: unknown, fallback: string): string => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { message?: unknown } } }).response;
        if (typeof response?.data?.message === 'string') return response.data.message;
    }
    return fallback;
};

const VendorAdminResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await api.post('/api/v1/vendor/auth/reset-password', { token, password });
            navigate('/vendor/admin/login');
        } catch (err: unknown) {
            setError(apiErrorMessage(err, 'Could not reset password.'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell title="Set New Password" subtitle="Create a new password for your vendor admin account.">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {!token && <div style={{ color: 'var(--danger)', fontSize: '14px' }}>Reset token is missing.</div>}
                {error && <div style={{ color: 'var(--danger)', fontSize: '14px' }}>{error}</div>}
                <AdminInput label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
                <AdminInput label="Confirm password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
                <AdminButton type="submit" isLoading={isLoading} disabled={!token} fullWidth>Reset Password</AdminButton>
                <Link to="/vendor/admin/login" style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>Back to login</Link>
            </form>
        </AuthShell>
    );
};

export default VendorAdminResetPassword;
