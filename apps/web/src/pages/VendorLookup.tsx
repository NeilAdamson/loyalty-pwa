import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import AdminInput from '../components/admin/ui/AdminInput';
import AdminButton from '../components/admin/ui/AdminButton';

const VendorLookup: React.FC = () => {
    const navigate = useNavigate();
    const [slug, setSlug] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!slug.trim()) return;

        setIsLoading(true);
        // Simulate a brief delay for UX
        setTimeout(() => {
            // Redirect to the vendor's staff login page
            // Logic: Assume the slug is valid. If not, the staff page will likely 404 or handle it.
            // Ideally backend would validate, but for now a direct redirect is the simplest "lookup".
            navigate(`/v/${slug.toLowerCase().trim()}/staff`);
            setIsLoading(false);
        }, 500);
    };

    return (
        <AuthShell
            title="Vendor Portal"
            subtitle="Enter your Store ID or Slug to access your dashboard."
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <AdminInput
                        label="Store Slug"
                        type="text"
                        value={slug}
                        onChange={e => setSlug(e.target.value)}
                        required
                        placeholder="e.g. coffee-shop"
                        autoFocus
                    />
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        This is the unique identifier provided during registration.
                    </p>
                </div>

                <AdminButton type="submit" variant="primary" isLoading={isLoading} fullWidth>
                    Go to Login
                </AdminButton>

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Back to Home
                    </button>
                </div>
            </form>
        </AuthShell>
    );
};

export default VendorLookup;
