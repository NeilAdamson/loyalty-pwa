import React, { useState } from 'react';
import { api } from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const AdminVendorCreate: React.FC = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        legal_name: '',
        trading_name: '',
        vendor_slug: '',
        billing_email: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/api/v1/admin/vendors', form);
            navigate('/admin/vendors');
        } catch (err) {
            alert('Failed to create vendor');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px' }}>
            <h2>Onboard New Vendor</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label>Legal Name</label>
                    <input
                        value={form.legal_name}
                        onChange={e => setForm({ ...form, legal_name: e.target.value })}
                        required
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div>
                    <label>Trading Name</label>
                    <input
                        value={form.trading_name}
                        onChange={e => setForm({ ...form, trading_name: e.target.value })}
                        required
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div>
                    <label>Slug (URL)</label>
                    <input
                        value={form.vendor_slug}
                        onChange={e => setForm({ ...form, vendor_slug: e.target.value })}
                        required
                        placeholder="e.g. demo-cafe"
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div>
                    <label>Billing Email</label>
                    <input
                        type="email"
                        value={form.billing_email}
                        onChange={e => setForm({ ...form, billing_email: e.target.value })}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <button disabled={submitting} type="submit" style={{ padding: '10px', background: 'blue', color: 'white' }}>
                    {submitting ? 'Creating...' : 'Create Vendor'}
                </button>
            </form>
        </div>
    );
};

export default AdminVendorCreate;
