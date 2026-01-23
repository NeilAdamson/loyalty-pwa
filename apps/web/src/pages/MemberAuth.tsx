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

    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const requestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await api.post(`/api/v1/v/${slug}/auth/member/otp/request`, { phone });
            setStep('OTP');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setIsLoading(false);
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
                    <AdminInput
                        label="Phone Number"
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+1 234 567 8900"
                        required
                        autoFocus
                    />
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
