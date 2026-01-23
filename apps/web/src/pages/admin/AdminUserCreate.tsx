import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import AdminInput from '../../components/admin/ui/AdminInput';

export default function AdminUserCreate() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'SUPPORT'
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/api/v1/admin/users', formData);
            navigate('/admin/users');
        } catch (err: any) {
            console.error('Create failed', err);
            setError(err.response?.data?.message || 'Failed to create admin');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px' }}>
            <AdminPageHeader
                title="Create Admin User"
                description="Add a new user with access to the platform backoffice."
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
                        label="Full Name"
                        placeholder="e.g. John Doe"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <AdminInput
                        label="Email Address"
                        type="email"
                        placeholder="john@loyalty.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required
                    />

                    <AdminInput
                        label="Initial Password"
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        required
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Role</label>
                        <select
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius)',
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        >
                            <option value="SUPPORT">Support</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        <AdminButton type="submit" isLoading={loading}>
                            Create User
                        </AdminButton>
                        <AdminButton variant="secondary" type="button" onClick={() => navigate('/admin/users')}>
                            Cancel
                        </AdminButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
