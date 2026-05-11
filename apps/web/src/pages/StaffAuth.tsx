import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/types';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import AdminInput from '../components/admin/ui/AdminInput';
import AdminButton from '../components/admin/ui/AdminButton';
import { persistRecentVendorSlug } from '../utils/vendorPortalStorage';
import { isPasskeyPlatformAvailable } from '../utils/passkeySupport';

const StaffAuth: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [diagnostic, setDiagnostic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [passkeyBusy, setPasskeyBusy] = useState(false);
    const [passkeyAvailable, setPasskeyAvailable] = useState(false);
    const [showPasskeyEnroll, setShowPasskeyEnroll] = useState(false);
    const [pendingStaff, setPendingStaff] = useState<{ role: string } | null>(null);

    useEffect(() => {
        void isPasskeyPlatformAvailable().then(setPasskeyAvailable);
    }, []);

    const navigateAfterStaff = (staff: { role: string }) => {
        if (staff.role === 'ADMIN') {
            navigate(`/v/${slug}/admin/dashboard`);
        } else {
            navigate(`/v/${slug}/staff/scan`);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setDiagnostic('');
        try {
            const res = await api.post(`/api/v1/v/${slug}/auth/staff/login`, { username, pin });
            login(res.data.token);
            if (slug) persistRecentVendorSlug(slug);

            if (passkeyAvailable) {
                setPendingStaff(res.data.staff);
                setShowPasskeyEnroll(true);
            } else {
                navigateAfterStaff(res.data.staff);
            }
        } catch (err: unknown) {
            const anyErr = err as { response?: { status?: number; data?: { code?: string; message?: string } } };
            const status = anyErr?.response?.status;
            const code = anyErr?.response?.data?.code;
            const message = anyErr?.response?.data?.message || (err instanceof Error ? err.message : 'Login Failed');

            setError(message);
            setDiagnostic(
                [status ? `HTTP ${status}` : 'HTTP ?',
                code || 'NO_CODE',
                message]
                    .join(' | ')
            );

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

    const skipPasskeyEnroll = () => {
        setShowPasskeyEnroll(false);
        if (pendingStaff) {
            navigateAfterStaff(pendingStaff);
            setPendingStaff(null);
        }
    };

    const enrollStaffPasskey = async () => {
        if (!slug) return;
        setPasskeyBusy(true);
        setError('');
        try {
            const opt = await api.post(`/api/v1/v/${slug}/auth/staff/passkey/register/options`);
            const reg = await startRegistration(opt.data.optionsJSON);
            await api.post(`/api/v1/v/${slug}/auth/staff/passkey/register/verify`, {
                stateId: opt.data.stateId,
                response: reg as RegistrationResponseJSON,
            });
            skipPasskeyEnroll();
        } catch (err: unknown) {
            const anyErr = err as { response?: { data?: { message?: string } } };
            setError(anyErr?.response?.data?.message || 'Could not add passkey.');
        } finally {
            setPasskeyBusy(false);
        }
    };

    const passkeySignIn = async () => {
        if (!slug) return;
        setPasskeyBusy(true);
        setError('');
        setDiagnostic('');
        try {
            const optRes = await api.post(`/api/v1/v/${slug}/auth/staff/passkey/auth/options`, {
                username: username.trim() || undefined,
            });
            const as = await startAuthentication(optRes.data.optionsJSON);
            const v = await api.post(`/api/v1/v/${slug}/auth/staff/passkey/auth/verify`, {
                stateId: optRes.data.stateId,
                response: as as AuthenticationResponseJSON,
            });
            login(v.data.token);
            if (slug) persistRecentVendorSlug(slug);
            navigateAfterStaff(v.data.staff);
        } catch (err: unknown) {
            const anyErr = err as { response?: { status?: number; data?: { code?: string; message?: string } } };
            const status = anyErr?.response?.status;
            const code = anyErr?.response?.data?.code;
            const message = anyErr?.response?.data?.message || 'Passkey sign-in failed';
            setError(message);
            setDiagnostic([status ? `HTTP ${status}` : 'HTTP ?', code || 'NO_CODE', message].join(' | '));
        } finally {
            setPasskeyBusy(false);
        }
    };

    return (
        <AuthShell
            title="Staff Login"
            subtitle="Stampers scan stamps/redemptions here. Managers with an Admin login land on the vendor dashboard after sign-in."
        >
            {showPasskeyEnroll && pendingStaff ? (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        background: 'rgba(15, 23, 42, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 20,
                    }}
                >
                    <div
                        style={{
                            maxWidth: 400,
                            width: '100%',
                            background: 'var(--surface, #1e293b)',
                            borderRadius: 12,
                            padding: 24,
                            border: '1px solid var(--border, rgba(255,255,255,0.12))',
                            color: 'var(--text, #f8fafc)',
                        }}
                    >
                        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Faster login next time?</h2>
                        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
                            Add a passkey for this staff account on this device. You can still use your PIN anytime.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <AdminButton type="button" variant="primary" isLoading={passkeyBusy} fullWidth onClick={() => void enrollStaffPasskey()}>
                                Add passkey
                            </AdminButton>
                            <AdminButton type="button" variant="secondary" disabled={passkeyBusy} fullWidth onClick={skipPasskeyEnroll}>
                                Not now
                            </AdminButton>
                        </div>
                    </div>
                </div>
            ) : null}

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

            {passkeyAvailable ? (
                <div style={{ marginBottom: 16 }}>
                    <AdminButton
                        type="button"
                        variant="secondary"
                        fullWidth
                        isLoading={passkeyBusy}
                        onClick={() => void passkeySignIn()}
                    >
                        Sign in with passkey
                    </AdminButton>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, textAlign: 'center' }}>
                        Enter your username first for a targeted passkey, or leave it blank to pick from saved passkeys.
                    </p>
                </div>
            ) : null}

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
