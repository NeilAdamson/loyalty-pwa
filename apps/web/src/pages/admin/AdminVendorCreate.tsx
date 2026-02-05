import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import AdminInput from '../../components/admin/ui/AdminInput';

/** Format phone as XXX XXXXXXX (3 + 7 digits). Accept only digits, max 10. */
function formatContactPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

/** Extract digits only for API submission */
function contactPhoneDigits(value: string): string {
    return value.replace(/\D/g, '');
}

export default function AdminVendorCreate() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        legal_name: '',
        trading_name: '',
        vendor_slug: '',
        billing_email: '',
        initial_branch_city: '',
        initial_branch_region: '',
        monthly_billing_amount: '',
        billing_start_date: new Date().toISOString().split('T')[0],
        contact_name: '',
        contact_surname: '',
        contact_phone: ''
    });
    const [isSlugTouched, setIsSlugTouched] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const slugify = (text: string) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[\s\W-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const validateForm = (): boolean => {
        const err: Record<string, string> = {};
        if (!formData.legal_name?.trim()) err.legal_name = 'Please enter legal name';
        if (!formData.trading_name?.trim()) err.trading_name = 'Please enter trading name';
        if (!formData.vendor_slug?.trim()) err.vendor_slug = 'Please enter URL slug';
        else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(formData.vendor_slug)) {
            err.vendor_slug = 'Slug can only contain lowercase letters, numbers and hyphens';
        }
        if (!formData.contact_name?.trim()) err.contact_name = 'Please enter contact name';
        if (!formData.contact_surname?.trim()) err.contact_surname = 'Please enter contact surname';
        const phoneDigits = contactPhoneDigits(formData.contact_phone);
        if (!phoneDigits) err.contact_phone = 'Please enter contact number (e.g. 082 123 4567)';
        else if (phoneDigits.length !== 10) err.contact_phone = 'Contact number must be 10 digits';
        if (!formData.billing_email?.trim()) err.billing_email = 'Please enter billing email';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.billing_email)) {
            err.billing_email = 'Please enter a valid email address';
        }
        if (!formData.monthly_billing_amount?.toString().trim()) err.monthly_billing_amount = 'Please enter monthly billing amount';
        if (!formData.billing_start_date?.trim()) err.billing_start_date = 'Please select billing start date';

        setFieldErrors(err);
        setError(Object.values(err)[0] || '');
        return Object.keys(err).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setFieldErrors({});

        if (!validateForm()) {
            setLoading(false);
            return;
        }

        const payload = {
            ...formData,
            contact_phone: contactPhoneDigits(formData.contact_phone),
            monthly_billing_amount: formData.monthly_billing_amount ? Number(formData.monthly_billing_amount) : 0,
        };

        try {
            await api.post('/api/v1/admin/vendors', payload);
            navigate('/admin/vendors');
        } catch (err: any) {
            const res = err.response?.data;
            const details = res?.details as Record<string, string> | undefined;
            if (details && typeof details === 'object') {
                setFieldErrors(details);
                setError(res?.message || Object.values(details)[0] || 'Failed to create vendor');
            } else {
                setError(res?.message || 'Failed to create vendor');
            }
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
                        error={fieldErrors.legal_name}
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
                        error={fieldErrors.trading_name}
                        required
                    />

                    <AdminInput
                        label="Url Slug"
                        placeholder="acme-cafe"
                        value={formData.vendor_slug}
                        onChange={e => {
                            setIsSlugTouched(true);
                            const validSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                            setFormData({ ...formData, vendor_slug: validSlug });
                        }}
                        helperText={`Public Link: ${window.location.origin}/v/${formData.vendor_slug || 'your-slug'}`}
                        error={fieldErrors.vendor_slug}
                        required
                    />

                    <h3 style={{ fontSize: '16px', marginTop: '10px', marginBottom: '8px' }}>Contact Person</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <AdminInput
                            label="Name"
                            type="text"
                            placeholder="e.g. John"
                            value={formData.contact_name}
                            onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                            error={fieldErrors.contact_name}
                            required
                        />
                        <AdminInput
                            label="Surname"
                            type="text"
                            placeholder="e.g. Doe"
                            value={formData.contact_surname}
                            onChange={e => setFormData({ ...formData, contact_surname: e.target.value })}
                            error={fieldErrors.contact_surname}
                            required
                        />
                    </div>
                    <AdminInput
                        label="Contact Telephone Number"
                        type="text"
                        placeholder="082 123 4567"
                        maxLength={12}
                        value={formData.contact_phone}
                        onChange={e => setFormData({ ...formData, contact_phone: formatContactPhone(e.target.value) })}
                        error={fieldErrors.contact_phone}
                        required
                    />

                    <h3 style={{ fontSize: '16px', marginTop: '20px', marginBottom: '8px' }}>Location</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <AdminInput
                            label="Branch (Region)"
                            type="text"
                            placeholder="e.g. Western Cape"
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

                    <h3 style={{ fontSize: '16px', marginTop: '20px', marginBottom: '8px' }}>Billing Setup</h3>
                    <AdminInput
                        label="Billing Email"
                        type="email"
                        placeholder="accounts@acme.com"
                        value={formData.billing_email}
                        onChange={e => setFormData({ ...formData, billing_email: e.target.value })}
                        error={fieldErrors.billing_email}
                        required
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <AdminInput
                            label="Monthly Billing Amount (R)"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={formData.monthly_billing_amount}
                            onChange={e => setFormData({ ...formData, monthly_billing_amount: e.target.value })}
                            error={fieldErrors.monthly_billing_amount}
                            required
                        />
                        <AdminInput
                            label="Billing Start Date"
                            type="date"
                            value={formData.billing_start_date}
                            onChange={e => setFormData({ ...formData, billing_start_date: e.target.value })}
                            error={fieldErrors.billing_start_date}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                        <AdminButton type="submit" isLoading={loading}>
                            Create Vendor
                        </AdminButton>
                        <AdminButton variant="secondary" type="button" onClick={() => navigate('/admin/vendors')}>
                            Cancel
                        </AdminButton>
                    </div>

                </form>
            </div >
        </div >
    );
}
