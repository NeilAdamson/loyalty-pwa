import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import AdminButton from '../components/admin/ui/AdminButton';
import AdminInput from '../components/admin/ui/AdminInput';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { persistRecentVendorSlug } from '../utils/vendorPortalStorage';

type Registration = {
    registration_id: string;
    email: string;
    first_name: string;
    last_name: string;
    trading_name: string;
    legal_name?: string | null;
    contact_phone?: string | null;
    vendor_slug?: string | null;
    status: string;
};

type CompleteResponse = {
    token: string;
    vendor: {
        vendor_slug: string;
    };
};

const apiErrorMessage = (err: unknown, fallback: string): string => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { message?: unknown } } }).response;
        if (typeof response?.data?.message === 'string') return response.data.message;
    }
    return fallback;
};

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-')
        .slice(0, 50)
        .replace(/-+$/g, '');

const VendorRegister: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [step, setStep] = useState<'details' | 'code' | 'password'>('details');
    const [registration, setRegistration] = useState<Registration | null>(null);
    const [form, setForm] = useState({
        email: '',
        first_name: '',
        last_name: '',
        trading_name: '',
        legal_name: '',
        contact_phone: '',
        code: '',
        vendor_slug: '',
        password: '',
        confirm_password: ''
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const suggestedSlug = useMemo(() => slugify(form.trading_name), [form.trading_name]);

    const update = (field: keyof typeof form, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const startRegistration = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);
        try {
            const res = await api.post<{ registration: Registration; expires_in_minutes: number }>('/api/v1/vendor/register/start', {
                email: form.email,
                first_name: form.first_name,
                last_name: form.last_name,
                trading_name: form.trading_name,
                legal_name: form.legal_name || form.trading_name,
                contact_phone: form.contact_phone
            });
            setRegistration(res.data.registration);
            update('vendor_slug', res.data.registration.vendor_slug || suggestedSlug);
            setMessage(`We sent a registration code to ${res.data.registration.email}.`);
            setStep('code');
        } catch (err: unknown) {
            setError(apiErrorMessage(err, 'Could not start registration.'));
        } finally {
            setIsLoading(false);
        }
    };

    const verifyCode = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!registration) return;
        setError('');
        setMessage('');
        setIsLoading(true);
        try {
            const res = await api.post<{ registration: Registration }>('/api/v1/vendor/register/verify', {
                registration_id: registration.registration_id,
                code: form.code
            });
            setRegistration(res.data.registration);
            setMessage('Email verified. Create your vendor admin password.');
            setStep('password');
        } catch (err: unknown) {
            setError(apiErrorMessage(err, 'Invalid registration code.'));
        } finally {
            setIsLoading(false);
        }
    };

    const completeRegistration = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!registration) return;
        if (form.password !== form.confirm_password) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setMessage('');
        setIsLoading(true);
        try {
            const res = await api.post<CompleteResponse>('/api/v1/vendor/register/complete', {
                registration_id: registration.registration_id,
                password: form.password,
                vendor_slug: form.vendor_slug || suggestedSlug,
                legal_name: form.legal_name || form.trading_name,
                trading_name: form.trading_name,
                contact_phone: form.contact_phone
            });
            login(res.data.token);
            persistRecentVendorSlug(res.data.vendor.vendor_slug);
            navigate(`/v/${res.data.vendor.vendor_slug}/admin/onboarding`);
        } catch (err: unknown) {
            setError(apiErrorMessage(err, 'Could not complete registration.'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            title="Create Vendor Account"
            subtitle="Register the owner/admin account first, then finish store setup in the onboarding wizard."
        >
            <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }} aria-hidden>
                {['details', 'code', 'password'].map((item) => (
                    <div
                        key={item}
                        style={{
                            height: '4px',
                            flex: 1,
                            borderRadius: '999px',
                            background: step === item ? 'var(--primary)' : 'var(--border)'
                        }}
                    />
                ))}
            </div>

            {error && <div style={{ marginBottom: '16px', color: 'var(--danger)', fontSize: '14px' }}>{error}</div>}
            {message && <div style={{ marginBottom: '16px', color: 'var(--success, #22c55e)', fontSize: '14px' }}>{message}</div>}

            {step === 'details' && (
                <form onSubmit={startRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <AdminInput label="Owner email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required autoFocus />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <AdminInput label="First name" value={form.first_name} onChange={(event) => update('first_name', event.target.value)} required />
                        <AdminInput label="Last name" value={form.last_name} onChange={(event) => update('last_name', event.target.value)} required />
                    </div>
                    <AdminInput label="Trading name" value={form.trading_name} onChange={(event) => update('trading_name', event.target.value)} required />
                    <AdminInput label="Legal name" value={form.legal_name} onChange={(event) => update('legal_name', event.target.value)} placeholder="Defaults to trading name" />
                    <AdminInput label="Contact phone" value={form.contact_phone} onChange={(event) => update('contact_phone', event.target.value)} />
                    <AdminButton type="submit" isLoading={isLoading} fullWidth>Send Registration Code</AdminButton>
                </form>
            )}

            {step === 'code' && (
                <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <AdminInput label="Registration code" value={form.code} onChange={(event) => update('code', event.target.value)} required inputMode="numeric" autoFocus />
                    <AdminButton type="submit" isLoading={isLoading} fullWidth>Verify Code</AdminButton>
                    <AdminButton type="button" variant="secondary" onClick={() => setStep('details')} fullWidth>Back</AdminButton>
                </form>
            )}

            {step === 'password' && (
                <form onSubmit={completeRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <AdminInput
                        label="Store slug"
                        value={form.vendor_slug}
                        onChange={(event) => update('vendor_slug', slugify(event.target.value))}
                        helperText="Used in URLs and staff bookmarks."
                        required
                    />
                    <AdminInput label="Password" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} required minLength={8} autoComplete="new-password" />
                    <AdminInput label="Confirm password" type="password" value={form.confirm_password} onChange={(event) => update('confirm_password', event.target.value)} required minLength={8} autoComplete="new-password" />
                    <AdminButton type="submit" isLoading={isLoading} fullWidth>Create Vendor</AdminButton>
                </form>
            )}

            <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '13px' }}>
                <Link to="/vendor/admin/login" style={{ color: 'var(--text-secondary)' }}>Already registered? Sign in</Link>
            </div>
        </AuthShell>
    );
};

export default VendorRegister;
