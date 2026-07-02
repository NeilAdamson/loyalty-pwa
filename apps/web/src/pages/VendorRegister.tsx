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

const SUPPORT_EMAIL = 'info@punchcard.co.za';

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
    const [expiresInMinutes, setExpiresInMinutes] = useState<number | null>(null);

    const suggestedSlug = useMemo(() => slugify(form.trading_name), [form.trading_name]);
    const steps = [
        {
            key: 'details',
            label: 'Business details',
            description: 'Tell us who owns the account and which business is joining.'
        },
        {
            key: 'code',
            label: 'Verify email',
            description: 'Enter the code sent to the business owner email.'
        },
        {
            key: 'password',
            label: 'Create password and Store ID',
            description: 'Choose the login password and the Store ID used in customer and staff links.'
        }
    ] as const;
    const activeStepIndex = steps.findIndex((item) => item.key === step);
    const activeStep = steps[activeStepIndex];

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
            setExpiresInMinutes(res.data.expires_in_minutes);
            update('vendor_slug', res.data.registration.vendor_slug || suggestedSlug);
            setMessage(`We sent a verification code to ${res.data.registration.email}.`);
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
            setMessage('Email verified. Create your business owner password.');
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
            title="Create vendor account"
            subtitle="Start a free trial, verify the business owner email, then finish setup in the guided wizard."
        >
            <div style={{ marginBottom: '22px' }}>
                <div
                    aria-label="Registration progress"
                    style={{ display: 'grid', gap: '8px' }}
                >
                    {steps.map((item, index) => (
                        <div
                            key={item.key}
                            aria-current={step === item.key ? 'step' : undefined}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '28px 1fr',
                                gap: '10px',
                                alignItems: 'center',
                                color: step === item.key ? 'var(--text)' : 'var(--text-secondary)',
                                fontSize: '13px'
                            }}
                        >
                            <span
                                aria-hidden="true"
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: step === item.key ? 'var(--primary)' : 'var(--border)',
                                    color: step === item.key ? 'var(--primary-contrast, #fff)' : 'var(--text-secondary)',
                                    fontWeight: 700
                                }}
                            >
                                {index + 1}
                            </span>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
                <p style={{ margin: '14px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Step {activeStepIndex + 1} of {steps.length}: <strong>{activeStep.label}</strong>. {activeStep.description}
                </p>
            </div>

            <div
                style={{
                    padding: '10px 12px',
                    marginBottom: '18px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    textAlign: 'center'
                }}
            >
                Need help? <a href={`mailto:${SUPPORT_EMAIL}?subject=Help with PunchCard signup`} style={{ color: 'var(--primary)' }}>Email {SUPPORT_EMAIL}</a>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '22px' }} aria-hidden="true">
                {steps.map((item) => (
                    <div
                        key={item.key}
                        style={{
                            height: '4px',
                            flex: 1,
                            borderRadius: '999px',
                            background: step === item.key ? 'var(--primary)' : 'var(--border)'
                        }}
                    />
                ))}
            </div>

            {error && <div style={{ marginBottom: '16px', color: 'var(--danger)', fontSize: '14px' }}>{error}</div>}
            {message && <div style={{ marginBottom: '16px', color: 'var(--success, #22c55e)', fontSize: '14px' }}>{message}</div>}

            {step === 'details' && (
                <form onSubmit={startRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <AdminInput label="Business owner email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required autoFocus />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <AdminInput label="Owner first name" value={form.first_name} onChange={(event) => update('first_name', event.target.value)} required />
                        <AdminInput label="Owner last name" value={form.last_name} onChange={(event) => update('last_name', event.target.value)} required />
                    </div>
                    <AdminInput label="Trading name" value={form.trading_name} onChange={(event) => update('trading_name', event.target.value)} required />
                    <AdminInput label="Legal name" value={form.legal_name} onChange={(event) => update('legal_name', event.target.value)} placeholder="Defaults to trading name" />
                    <AdminInput label="Contact phone" value={form.contact_phone} onChange={(event) => update('contact_phone', event.target.value)} />
                    <AdminButton type="submit" isLoading={isLoading} fullWidth>Send verification code</AdminButton>
                </form>
            )}

            {step === 'code' && (
                <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {registration && (
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                            We sent a code to <strong>{registration.email}</strong>
                            {expiresInMinutes ? ` that expires in ${expiresInMinutes} minutes.` : '.'}
                        </p>
                    )}
                    <AdminInput label="Verification code" value={form.code} onChange={(event) => update('code', event.target.value)} required inputMode="numeric" autoFocus />
                    <AdminButton type="submit" isLoading={isLoading} fullWidth>Verify email</AdminButton>
                    <AdminButton type="button" variant="secondary" onClick={() => setStep('details')} fullWidth>Back</AdminButton>
                </form>
            )}

            {step === 'password' && (
                <form onSubmit={completeRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <AdminInput
                        label="Store ID"
                        value={form.vendor_slug}
                        onChange={(event) => update('vendor_slug', slugify(event.target.value))}
                        helperText="Used in customer links and Staff login bookmarks, for example /v/demo-cafe."
                        required
                    />
                    <AdminInput label="Password" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} required minLength={8} autoComplete="new-password" />
                    <AdminInput label="Confirm password" type="password" value={form.confirm_password} onChange={(event) => update('confirm_password', event.target.value)} required minLength={8} autoComplete="new-password" />
                    <AdminButton type="submit" isLoading={isLoading} fullWidth>Create vendor account</AdminButton>
                </form>
            )}

            <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '13px' }}>
                <Link to="/vendor/admin/login" style={{ color: 'var(--text-secondary)' }}>Already registered? Business owner login</Link>
            </div>
        </AuthShell>
    );
};

export default VendorRegister;
