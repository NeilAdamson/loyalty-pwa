import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';

const ADMIN_EMAIL_DOMAIN = 'punchcard.co.za';

const AdminForgotPassword: React.FC = () => {
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/api/v1/admin/auth/forgot-password', { identifier: identifier.trim() });
            setSubmitted(true);
        } catch (err: any) {
            console.error('Forgot password error:', err);
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#28a745' }}>Check your email</h2>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                </div>
                <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
                    If an account exists with that username, we've sent a password reset link to the associated email address.
                </p>
                <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                    The link will expire in 1 hour.
                </p>
                <div style={{ textAlign: 'center' }}>
                    <Link 
                        to="/admin/login" 
                        style={{ color: '#007bff', textDecoration: 'none' }}
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Forgot Password</h2>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                Enter your username and we'll send a reset link to your @{ADMIN_EMAIL_DOMAIN} email.
            </p>
            
            {error && (
                <div style={{ color: 'red', marginBottom: '10px', textAlign: 'center', padding: '10px', background: 'rgba(255,0,0,0.1)', borderRadius: '4px' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Username</label>
                    <input
                        type="text"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value.toLowerCase().replace(/[^a-z0-9._@-]/g, ''))}
                        placeholder="e.g. john.doe"
                        required
                        disabled={loading}
                        style={{ 
                            width: '100%', 
                            padding: '10px', 
                            borderRadius: '4px', 
                            border: '1px solid #ddd', 
                            boxSizing: 'border-box',
                            opacity: loading ? 0.7 : 1
                        }}
                    />
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                        You can also enter your full email address.
                    </p>
                </div>

                <button 
                    type="submit" 
                    disabled={loading || !identifier.trim()}
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        background: loading ? '#6c757d' : '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: loading ? 'not-allowed' : 'pointer', 
                        fontSize: '16px' 
                    }}
                >
                    {loading ? 'Sending...' : 'Send Reset Link'}
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

export default AdminForgotPassword;
