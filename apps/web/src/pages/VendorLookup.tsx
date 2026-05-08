import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import AdminInput from '../components/admin/ui/AdminInput';
import AdminButton from '../components/admin/ui/AdminButton';
import { api } from '../utils/api';
import {
    clearRecentVendorSlug,
    normalizeVendorSlugInput,
    persistRecentVendorSlug,
    readRecentVendorSlug,
    VENDOR_SLUG_PATTERN,
} from '../utils/vendorPortalStorage';

const VendorLookup: React.FC = () => {
    const navigate = useNavigate();
    const [slug, setSlug] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [recentSlug, setRecentSlug] = useState<string | null>(null);

    useEffect(() => {
        const recent = readRecentVendorSlug();
        setRecentSlug(recent);
        if (recent) setSlug(recent);
    }, []);

    const goToStaffLogin = (nextSlug: string) => {
        const normalized = normalizeVendorSlugInput(nextSlug);
        persistRecentVendorSlug(normalized);
        navigate(`/v/${normalized}/staff`);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const normalized = normalizeVendorSlugInput(slug);
        if (!normalized) {
            setError('Enter your store slug.');
            return;
        }
        if (!VENDOR_SLUG_PATTERN.test(normalized)) {
            setError(
                'Use lowercase letters, numbers, and single hyphens only (e.g. demo-cafe). No spaces.'
            );
            return;
        }

        setIsLoading(true);
        try {
            await api.get(`/api/v1/v/${normalized}/portal/status`);
            goToStaffLogin(normalized);
        } catch (err: unknown) {
            const ax = err as { response?: { status?: number; data?: { code?: string; message?: string } } };
            const status = ax.response?.status;
            const code = ax.response?.data?.code;
            const message = ax.response?.data?.message;

            if (status === 404 || code === 'NOT_FOUND') {
                setError(
                    'No active store found for that slug. Check spelling or contact support — your slug was emailed when you joined.'
                );
            } else if (status === 403 || code === 'VENDOR_SUSPENDED') {
                setError('This vendor account is suspended. Staff login is blocked until reactivated.');
            } else {
                setError(
                    message ||
                        'Could not verify that slug right now. Try again or use the link from your onboarding email.'
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinueRecent = () => {
        if (!recentSlug) return;
        setSlug(recentSlug);
        void (async () => {
            setError('');
            setIsLoading(true);
            try {
                await api.get(`/api/v1/v/${recentSlug}/portal/status`);
                goToStaffLogin(recentSlug);
            } catch {
                setError(
                    'Your saved store is no longer available or was suspended. Enter your slug below or clear saved store.'
                );
            } finally {
                setIsLoading(false);
            }
        })();
    };

    return (
        <AuthShell
            title="Vendor Portal"
            subtitle="Counter staff use Store Slug plus username/PIN. Owners and managers use email/password."
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {recentSlug && (
                    <div
                        style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--radius)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            background: 'rgba(59, 130, 246, 0.08)',
                            fontSize: '14px',
                        }}
                    >
                        <div style={{ marginBottom: '8px', fontWeight: 600 }}>Last store on this device</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            <code style={{ fontSize: '13px' }}>{recentSlug}</code>
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={handleContinueRecent}
                                disabled={isLoading}
                            >
                                Continue
                            </AdminButton>
                            <button
                                type="button"
                                onClick={() => {
                                    clearRecentVendorSlug();
                                    setRecentSlug(null);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    fontSize: '13px',
                                }}
                            >
                                Clear saved store
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div
                        style={{
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: 'var(--danger)',
                            borderRadius: 'var(--radius)',
                            fontSize: '14px',
                        }}
                    >
                        {error}
                    </div>
                )}

                <div>
                    <AdminInput
                        label="Store Slug"
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        required
                        placeholder="e.g. demo-cafe"
                        autoFocus
                        autoComplete="organization"
                    />
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Lowercase only — e.g. <strong>demo-cafe</strong>. Tip: bookmark{' '}
                        <strong>/v/your-slug/staff</strong> on shop tablets to skip this step.
                    </p>
                </div>

                <AdminButton type="submit" variant="primary" isLoading={isLoading} fullWidth>
                    Go to Staff Login
                </AdminButton>

                <div style={{ display: 'grid', gap: '8px', textAlign: 'center', fontSize: '13px' }}>
                    <Link to="/vendor/admin/login" style={{ color: 'var(--primary)' }}>
                        Owner / manager email login
                    </Link>
                    <Link to="/vendor/register" style={{ color: 'var(--text-secondary)' }}>
                        Register a new vendor
                    </Link>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                    >
                        Back to Home
                    </button>
                </div>
            </form>
        </AuthShell>
    );
};

export default VendorLookup;
