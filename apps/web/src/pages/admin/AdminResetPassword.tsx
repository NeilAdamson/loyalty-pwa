import React, { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

const MIN_LENGTH = 8;

function passwordChecks(pwd: string) {
    const lengthOk = pwd.length >= MIN_LENGTH;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    return { lengthOk, hasUpper, hasLower, hasNumber };
}

function passwordAcceptable(pwd: string): boolean {
    const { lengthOk, hasUpper, hasLower, hasNumber } = passwordChecks(pwd);
    return lengthOk && hasUpper && hasLower && hasNumber;
}

const AdminResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const pwdChecks = useMemo(() => passwordChecks(password), [password]);
    const pwdOk = passwordAcceptable(password);
    const passwordsMatch = password === confirmPassword;
    const canSubmit = pwdOk && passwordsMatch && token;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        
        setError('');
        setLoading(true);

        try {
            await api.post('/api/v1/admin/auth/reset-password', { token, password });
            setSuccess(true);
            setTimeout(() => navigate('/admin/login'), 3000);
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#dc3545' }}>Invalid Link</h2>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
                    This password reset link is invalid or has expired.
                </p>
                <div style={{ textAlign: 'center' }}>
                    <Link 
                        to="/admin/forgot-password" 
                        style={{ color: '#007bff', textDecoration: 'none' }}
                    >
                        Request a new reset link
                    </Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#28a745' }}>Password Reset!</h2>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
                    Your password has been successfully reset. Redirecting to login...
                </p>
                <div style={{ textAlign: 'center' }}>
                    <Link 
                        to="/admin/login" 
                        style={{ color: '#007bff', textDecoration: 'none' }}
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Reset Password</h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                Enter your new password below.
            </p>
            
            {error && (
                <div style={{ color: '#dc3545', marginBottom: '15px', textAlign: 'center', padding: '10px', background: 'rgba(220,53,69,0.1)', borderRadius: '4px' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>New Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter new password"
                            required
                            disabled={loading}
                            style={{ 
                                width: '100%', 
                                padding: '10px', 
                                paddingRight: '40px',
                                borderRadius: '4px', 
                                border: '1px solid #ddd', 
                                boxSizing: 'border-box',
                                opacity: loading ? 0.7 : 1
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            )}
                        </button>
                    </div>
                    
                    {/* Password requirements */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {[
                            { label: '8+ chars', ok: pwdChecks.lengthOk },
                            { label: 'Uppercase', ok: pwdChecks.hasUpper },
                            { label: 'Lowercase', ok: pwdChecks.hasLower },
                            { label: 'Number', ok: pwdChecks.hasNumber }
                        ].map(({ label, ok }) => (
                            <span
                                key={label}
                                style={{
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: ok ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: ok ? '#22c55e' : '#ef4444',
                                    fontWeight: 500
                                }}
                            >
                                {label} {ok ? '✓' : '○'}
                            </span>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Confirm Password</label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        disabled={loading}
                        style={{ 
                            width: '100%', 
                            padding: '10px', 
                            borderRadius: '4px', 
                            border: `1px solid ${confirmPassword && !passwordsMatch ? '#dc3545' : '#ddd'}`, 
                            boxSizing: 'border-box',
                            opacity: loading ? 0.7 : 1
                        }}
                    />
                    {confirmPassword && !passwordsMatch && (
                        <p style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px' }}>
                            Passwords do not match
                        </p>
                    )}
                </div>

                <button 
                    type="submit" 
                    disabled={loading || !canSubmit}
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        background: (loading || !canSubmit) ? '#6c757d' : '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: (loading || !canSubmit) ? 'not-allowed' : 'pointer', 
                        fontSize: '16px' 
                    }}
                >
                    {loading ? 'Resetting...' : 'Reset Password'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <Link 
                        to="/admin/login" 
                        style={{ color: '#007bff', textDecoration: 'none', fontSize: '14px' }}
                    >
                        Back to Login
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default AdminResetPassword;
