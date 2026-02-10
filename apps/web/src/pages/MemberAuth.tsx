import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import AdminInput from '../components/admin/ui/AdminInput';
import AdminButton from '../components/admin/ui/AdminButton';

const MemberAuth: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [phoneParts, setPhoneParts] = useState({ network: '', number: '' });
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Strict lock to prevent double-fire
    const isSubmittingRef = React.useRef(false);

    // Derived phone for API
    const phone = `+27${phoneParts.network.replace(/^0/, '')}${phoneParts.number}`;

    const handleNetworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 3);
        setPhoneParts(prev => ({ ...prev, network: val }));

        // Auto-focus next if full (simple logic, ref improved later if needed)
        if (val.length === 3) {
            document.getElementById('sub-input')?.focus();
        }
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 7);
        setPhoneParts(prev => ({ ...prev, number: val }));
    };

    const requestOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmittingRef.current) return; // Block double clicks

        // Validation
        if (phoneParts.network.length !== 3 || phoneParts.number.length !== 7) {
            setError('Please enter a valid SA mobile number (e.g. 082 123 4567)');
            return;
        }

        isSubmittingRef.current = true;
        setIsLoading(true);
        setError('');
        try {
            await api.post(`/api/v1/v/${slug}/auth/member/otp/request`, { phone });
            setStep('OTP');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send OTP');
            // Release lock immediately on error so they can retry
            isSubmittingRef.current = false;
        } finally {
            setIsLoading(false);
            // Keep lock held for a moment to prevent accidental double-tap on success/transition
            setTimeout(() => {
                isSubmittingRef.current = false;
            }, 1000);
        }
    };

    const verifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await api.post(`/api/v1/v/${slug}/auth/member/otp/verify`, { phone, code });
            login(res.data.token); // Updates context
            navigate('/me/card'); // Redirect to protected route
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid Code');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            title="Welcome"
            subtitle={step === 'PHONE' ? "Enter your mobile number to join or login" : `Enter the code sent to ${phone}`}
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

            {step === 'PHONE' ? (
                <form onSubmit={requestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* SA Phone Input Enforcement */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Country Code (Fixed) */}
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

                            {/* Network Code (3 Digits) */}
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

                            {/* Subscriber Number (7 Digits) */}
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
                </form>
            ) : (
                <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <AdminInput
                        label="Verification Code"
                        type="text"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        placeholder="123456"
                        required
                        autoFocus
                    />
                    <AdminButton type="submit" variant="primary" isLoading={isLoading} fullWidth>
                        Verify & Login
                    </AdminButton>
                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setStep('PHONE')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                textDecoration: 'underline'
                            }}
                        >
                            Change Phone Number
                        </button>
                    </div>
                </form>
            )}
        </AuthShell>
    );
};

export default MemberAuth;
