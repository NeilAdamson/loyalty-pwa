import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import AdminInput from '../components/admin/ui/AdminInput';
import AdminButton from '../components/admin/ui/AdminButton';

const StaffAuth: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [diagnostic, setDiagnostic] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setDiagnostic('');
        try {
            const res = await api.post(`/api/v1/v/${slug}/auth/staff/login`, { username, pin });
            login(res.data.token);

            if (res.data.staff.role === 'ADMIN') {
                navigate(`/v/${slug}/admin/dashboard`);
            } else {
                navigate(`/v/${slug}/staff/scan`);
            }
        } catch (err: any) {
            const status = err?.response?.status;
            const code = err?.response?.data?.code;
            const message = err?.response?.data?.message || err?.message || 'Login Failed';

            setError(message);
            setDiagnostic(
                [status ? `HTTP ${status}` : 'HTTP ?',
                code || 'NO_CODE',
                message]
                    .join(' | ')
            );

            // Compact structured log for fast support triage.
            console.warn('[StaffAuth] Login failed', {
                status,
                code,
                message,
                url: `/api/v1/v/${slug}/auth/staff/login`,
                username: username?.trim().toLowerCase()
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            title="Staff Login"
            subtitle="Access the scanner and branch tools"
        >
            {error && (
                <div style={{
                    padding: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: 'var(--danger)',
                    borderRadius: 'var(--radius)',
                    marginBottom: '20px',
                    fontSize: '14px'
                }}>
                    {error}
                </div>
            )}
            {diagnostic && (
                <div
                    style={{
                        marginTop: '-12px',
                        marginBottom: '16px',
                        fontSize: '12px',
                        color: 'var(--text-tertiary)',
                        fontFamily: 'monospace',
                        opacity: 0.9
                    }}
                    aria-live="polite"
                >
                    {diagnostic}
                </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <AdminInput
                    label="Username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    placeholder="e.g. alice, bob"
                    autoFocus
                />
                <AdminInput
                    label="PIN"
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="****"
                    required
                />
                <AdminButton type="submit" variant="primary" isLoading={isLoading} fullWidth>
                    Login
                </AdminButton>
            </form>
        </AuthShell>
    );
};

export default StaffAuth;
