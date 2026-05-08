import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import AdminButton from '../components/admin/ui/AdminButton';
import AdminInput from '../components/admin/ui/AdminInput';
import { api } from '../utils/api';

const VendorAdminForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            await api.post('/api/v1/vendor/auth/forgot-password', { email });
            setMessage('If a vendor admin account exists for that email, a reset link has been sent.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell title="Reset Vendor Password" subtitle="Enter the email used for the vendor admin account.">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {message && <div style={{ color: 'var(--success, #22c55e)', fontSize: '14px' }}>{message}</div>}
                <AdminInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus />
                <AdminButton type="submit" isLoading={isLoading} fullWidth>Send Reset Link</AdminButton>
                <Link to="/vendor/admin/login" style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>Back to login</Link>
            </form>
        </AuthShell>
    );
};

export default VendorAdminForgotPassword;
