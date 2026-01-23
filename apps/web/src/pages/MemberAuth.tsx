import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MemberAuth: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
    const [error, setError] = useState('');

    const requestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/v/${slug}/auth/member/otp/request`, { phone });
            setStep('OTP');
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        }
    };

    const verifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post(`/v/${slug}/auth/member/otp/verify`, { phone, code });
            login(res.data.token); // Updates context
            navigate('/me/card'); // Redirect to protected route
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid Code');
        }
    };

    return (
        <div className="auth-container">
            <h2>Member Login</h2>
            {error && <div className="error">{error}</div>}

            {step === 'PHONE' ? (
                <form onSubmit={requestOtp}>
                    <label>Phone Number</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+1234567890"
                        required
                    />
                    <button type="submit">Send Code</button>
                </form>
            ) : (
                <form onSubmit={verifyOtp}>
                    <label>Enter Code</label>
                    <input
                        type="text"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        placeholder="123456"
                        required
                    />
                    <button type="submit">Verify</button>
                </form>
            )}
        </div>
    );
};

export default MemberAuth;
