import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { startAuthentication } from '@simplewebauthn/browser';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import AdminInput from '../components/admin/ui/AdminInput';
import AdminButton from '../components/admin/ui/AdminButton';
import { isPasskeyPlatformAvailable } from '../utils/passkeySupport';
import {
    hasSignedSignupToken,
    loadSignupContext,
    parseSignupContextFromSearch,
    saveSignupContext,
    signupContextFromQuery,
    type SignupContext,
} from '../utils/signupContext';

const PASSKEY_PROMPT_KEY = 'punchcard_prompt_passkey';
const OTP_RESEND_COOLDOWN_SEC = 60;

type ApiErrorBody = {
    message?: string;
    code?: string;
    retry_after_sec?: number;
};

const getApiErrorMessage = (err: unknown, fallback: string): string => {
    if (!axios.isAxiosError<ApiErrorBody>(err)) return fallback;

    const code = err.response?.data?.code;
    const retryAfter = err.response?.data?.retry_after_sec;
    const retryHeader = err.response?.headers?.['retry-after'];
    const retrySec = retryAfter ?? (retryHeader ? Number.parseInt(String(retryHeader), 10) : undefined);

    if (code === 'OTP_INVALID') {
        return 'That code is incorrect or has expired. Try again or request a new code.';
    }
    if (code === 'OTP_EXPIRED') {
        return 'That code has expired. Request a new code to continue.';
    }
    if (code === 'OTP_RATE_LIMITED') {
        return retrySec
            ? `Too many incorrect attempts. Wait ${retrySec} seconds, then try again.`
            : 'Too many incorrect attempts. Wait a moment, then try again.';
    }
    if (code === 'RATE_LIMITED') {
        return retrySec
            ? `Too many SMS requests. Try again in ${retrySec} seconds.`
            : 'Too many SMS requests. Please wait before requesting another code.';
    }
    if (code === 'SIGNUP_QR_INVALID') {
        return 'This QR code is no longer valid. Ask staff for a new signup poster.';
    }

    return err.response?.data?.message || fallback;
};

const MemberAuth: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [phoneParts, setPhoneParts] = useState({ network: '', number: '' });
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [passkeyAvailable, setPasskeyAvailable] = useState(false);
    const [signupContext, setSignupContext] = useState<SignupContext | null>(null);
    const [signupGateChecked, setSignupGateChecked] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendMessage, setResendMessage] = useState('');

    const isSubmittingRef = React.useRef(false);
    const passkeyAbortRef = React.useRef<AbortController | null>(null);

    useEffect(() => {
        if (!slug) return;

        const fromUrl = parseSignupContextFromSearch(location.search);
        const stored = loadSignupContext(slug);
        const merged: SignupContext = {
            ...stored,
            ...signupContextFromQuery(fromUrl),
        };

        if (Object.keys(signupContextFromQuery(fromUrl)).length > 0) {
            saveSignupContext(slug, merged);
        }

        setSignupContext(merged);

        void api.get(`/api/v1/v/${slug}/public`)
            .then((res) => {
                const requiresSigned = res.data?.signup?.requires_signed_url === true;
                if (requiresSigned && !hasSignedSignupToken(merged)) {
                    setError('This QR code is no longer valid. Ask staff for a new signup poster.');
                }
            })
            .catch(() => {
                setError('Unable to load store details. Please try again.');
            })
            .finally(() => setSignupGateChecked(true));
    }, [slug, location.search]);

    const buildSignupPayload = () => signupContextFromQuery(signupContext ?? {});

    useEffect(() => {
        void isPasskeyPlatformAvailable().then(setPasskeyAvailable);
    }, []);

    useEffect(() => {
        if (step !== 'OTP' || resendCooldown <= 0) return;
        const timer = window.setInterval(() => {
            setResendCooldown((value) => (value > 0 ? value - 1 : 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [step, resendCooldown]);

    useEffect(() => {
        if (step !== 'PHONE' || !slug || !passkeyAvailable) return;

        const ac = new AbortController();
        passkeyAbortRef.current = ac;

        const run = async () => {
            try {
                const optRes = await api.post(
                    `/api/v1/v/${slug}/auth/member/passkey/auth/options`,
                    {},
                    { signal: ac.signal }
                );
                const as = await startAuthentication(optRes.data.optionsJSON, true);
                if (ac.signal.aborted) return;
                const v = await api.post(
                    `/api/v1/v/${slug}/auth/member/passkey/auth/verify`,
                    {
                        stateId: optRes.data.stateId,
                        response: as as AuthenticationResponseJSON,
                    },
                    { signal: ac.signal }
                );
                login(v.data.token);
                navigate('/me/card');
            } catch {
                // No passkey / user dismissed / network — fall back to SMS silently
            }
        };

        void run();
        return () => {
            ac.abort();
            passkeyAbortRef.current = null;
        };
    }, [step, slug, passkeyAvailable, login, navigate]);

    const phone = `+27${phoneParts.network.replace(/^0/, '')}${phoneParts.number}`;

    const handleNetworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 3);
        setPhoneParts((prev) => ({ ...prev, network: val }));
        if (val.length === 3) {
            document.getElementById('sub-input')?.focus();
        }
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 7);
        setPhoneParts((prev) => ({ ...prev, number: val }));
    };

    const sendOtp = async () => {
        await api.post(`/api/v1/v/${slug}/auth/member/otp/request`, {
            phone,
            ...buildSignupPayload(),
        });
        setStep('OTP');
        setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
        setResendMessage('A new code was sent.');
    };

    const requestOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmittingRef.current) return;

        if (phoneParts.network.length !== 3 || phoneParts.number.length !== 7) {
            setError('Please enter a valid SA mobile number (e.g. 082 123 4567)');
            return;
        }

        isSubmittingRef.current = true;
        setIsLoading(true);
        setError('');
        setResendMessage('');
        try {
            await sendOtp();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to send OTP'));
            isSubmittingRef.current = false;
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                isSubmittingRef.current = false;
            }, 1000);
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0 || isLoading) return;
        setIsLoading(true);
        setError('');
        setResendMessage('');
        try {
            await sendOtp();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to resend OTP'));
        } finally {
            setIsLoading(false);
        }
    };

    const verifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setResendMessage('');
        try {
            const res = await api.post(`/api/v1/v/${slug}/auth/member/otp/verify`, {
                phone,
                code,
                consent_marketing: marketingConsent,
                ...buildSignupPayload(),
            });
            login(res.data.token);
            sessionStorage.setItem(PASSKEY_PROMPT_KEY, '1');
            navigate('/me/card');
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Invalid Code'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!signupGateChecked) {
        return (
            <AuthShell title="Welcome" subtitle="Loading...">
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</div>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Welcome"
            subtitle={step === 'PHONE' ? 'Enter your mobile number to join or login' : `Enter the code sent to ${phone}`}
        >
            {error ? (
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
            ) : null}

            {resendMessage ? (
                <div style={{
                    padding: '12px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius)',
                    marginBottom: '20px',
                    fontSize: '14px'
                }}>
                    {resendMessage}
                </div>
            ) : null}

            {step === 'PHONE' ? (
                <form onSubmit={requestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                    {passkeyAvailable ? (
                        <input
                            type="text"
                            name="username"
                            autoComplete="username webauthn"
                            value={phone}
                            readOnly
                            tabIndex={-1}
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                width: 1,
                                height: 1,
                                padding: 0,
                                margin: -1,
                                overflow: 'hidden',
                                clip: 'rect(0,0,0,0)',
                                whiteSpace: 'nowrap',
                                border: 0,
                            }}
                        />
                    ) : null}

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)',
                                padding: '12px 0',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                userSelect: 'none',
                                width: '48px',
                                textAlign: 'center',
                                flexShrink: 0
                            }}>
                                +27
                            </div>

                            <input
                                type="tel"
                                value={phoneParts.network}
                                onChange={handleNetworkChange}
                                placeholder="082"
                                maxLength={3}
                                style={{
                                    flex: '0 0 70px',
                                    width: '70px',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text)',
                                    padding: '12px 10px',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    outline: 'none',
                                    textAlign: 'center',
                                    letterSpacing: '0.05em'
                                }}
                                required
                            />

                            <input
                                id="sub-input"
                                type="tel"
                                value={phoneParts.number}
                                onChange={handleNumberChange}
                                placeholder="123 4567"
                                maxLength={7}
                                style={{
                                    flex: 1,
                                    width: '100%',
                                    minWidth: 0,
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text)',
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    outline: 'none',
                                    letterSpacing: '0.05em',
                                    textAlign: 'left'
                                }}
                                required
                            />
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                            Example: 082 1234567
                        </p>
                    </div>

                    <AdminButton type="submit" variant="primary" isLoading={isLoading} fullWidth>
                        Continue
                    </AdminButton>
                    <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45
                    }}>
                        <input
                            type="checkbox"
                            checked={marketingConsent}
                            onChange={(e) => setMarketingConsent(e.target.checked)}
                            style={{ marginTop: '2px' }}
                        />
                        <span>
                            Send me reward reminders and occasional offers from this store. Message costs may apply and I can opt out later.
                        </span>
                    </label>
                </form>
            ) : (
                <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <AdminInput
                        label="Verification Code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="123456"
                        required
                        autoFocus
                    />
                    <AdminButton type="submit" variant="primary" isLoading={isLoading} fullWidth>
                        Verify & Login
                    </AdminButton>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={resendCooldown > 0 || isLoading}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: resendCooldown > 0 ? 'var(--text-tertiary)' : 'var(--primary-color, #4f46e5)',
                                cursor: resendCooldown > 0 || isLoading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 600,
                                textDecoration: resendCooldown > 0 ? 'none' : 'underline',
                            }}
                        >
                            {resendCooldown > 0
                                ? `Resend code in ${resendCooldown}s`
                                : "Didn't receive a code? Resend"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setStep('PHONE');
                                setCode('');
                                setError('');
                                setResendMessage('');
                                setResendCooldown(0);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                textDecoration: 'underline'
                            }}
                        >
                            Change phone number
                        </button>
                    </div>
                </form>
            )}
        </AuthShell>
    );
};

export default MemberAuth;
