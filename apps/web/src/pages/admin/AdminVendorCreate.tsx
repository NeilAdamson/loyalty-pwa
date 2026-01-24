import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import AdminInput from '../../components/admin/ui/AdminInput';

export default function AdminVendorCreate() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        legal_name: '',
        trading_name: '',
        vendor_slug: '',
        billing_email: '',
        initial_branch_city: '',
        initial_branch_region: ''
    });
    const [isSlugTouched, setIsSlugTouched] = useState(false);
    const [error, setError] = useState('');

    const slugify = (text: string) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[\s\W-]+/g, '-') // Replace spaces, non-word chars with -
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing -
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/api/v1/admin/vendors', formData);
            navigate('/admin/vendors');
        } catch (err: any) {
            console.error('Create failed', err);
            setError(err.response?.data?.message || 'Failed to create vendor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px' }}>
            <AdminPageHeader
                title="Onboard New Vendor"
                description="Create a new vendor account. This will generate a trial subscription."
            />

            <div style={{
                background: 'var(--surface)',
                padding: 'var(--space-6)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow)'
            }}>
                {error && (
                    <div style={{
                        padding: '12px',
                        background: 'rgba(255, 77, 77, 0.1)',
                        color: 'var(--danger)',
                        borderRadius: 'var(--radius)',
                        marginBottom: '20px',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <AdminInput
                        label="Legal Name"
                        placeholder="e.g. Acme Corp Pty Ltd"
                        value={formData.legal_name}
                        onChange={e => setFormData({ ...formData, legal_name: e.target.value })}
                        required
                    />

                    <AdminInput
                        label="Trading Name"
                        placeholder="e.g. Acme Café"
                        value={formData.trading_name}
                        onChange={e => {
                            const newName = e.target.value;
                            setFormData(prev => ({
                                ...prev,
                                trading_name: newName,
                                vendor_slug: !isSlugTouched ? slugify(newName) : prev.vendor_slug
                            }));
                        }}
                        required
                    />

                    <AdminInput
                        label="Url Slug"
                        placeholder="acme-cafe"
                        value={formData.vendor_slug}
                        onChange={e => {
                            setIsSlugTouched(true);
                            // Only allow valid slug chars
                            const validSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                            setFormData({ ...formData, vendor_slug: validSlug });
                        }}
                        helperText={`Public Link: ${window.location.origin}/v/${formData.vendor_slug || 'your-slug'}`}
                        required
                    />

                    <AdminInput
                        label="Billing Email"
                        type="email"
                        placeholder="accounts@acme.com"
                        value={formData.billing_email}
                        onChange={e => setFormData({ ...formData, billing_email: e.target.value })}
                        required
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <AdminInput
                            label="Branch"
                            placeholder="e.g. East"
                            value={formData.initial_branch_region}
                            onChange={e => setFormData({ ...formData, initial_branch_region: e.target.value })}
                        />
                        <AdminInput
                            label="City"
                            placeholder="e.g. Johannesburg"
                            value={formData.initial_branch_city}
                            onChange={e => setFormData({ ...formData, initial_branch_city: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        <AdminButton type="submit" isLoading={loading}>
                            Create Vendor
                        </AdminButton>
                        <AdminButton variant="secondary" type="button" onClick={() => navigate('/admin/vendors')}>
                            Cancel
                        </AdminButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
