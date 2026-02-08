import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import AdminInput from '../../components/admin/ui/AdminInput';

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

export default function AdminUserCreate() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'SUPPORT'
    });
    const [error, setError] = useState('');
    const pwdChecks = passwordChecks(formData.password);
    const pwdOk = passwordAcceptable(formData.password);

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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Initial Password <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span>
                        </label>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Min 8 chars, upper, lower, number"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px 44px 10px 12px',
                                    borderRadius: 'var(--radius)',
                                    background: 'var(--bg)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text)',
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                )}
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {[
                                    { key: 'lengthOk', label: '8+ chars', ok: pwdChecks.lengthOk },
                                    { key: 'hasUpper', label: 'Uppercase', ok: pwdChecks.hasUpper },
                                    { key: 'hasLower', label: 'Lowercase', ok: pwdChecks.hasLower },
                                    { key: 'hasNumber', label: 'Number', ok: pwdChecks.hasNumber }
                                ].map(({ label, ok }) => (
                                    <span
                                        key={label}
                                        style={{
                                            fontSize: '12px',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            background: ok ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                            color: ok ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                                            fontWeight: 500
                                        }}
                                    >
                                        {label} {ok ? '✓' : '○'}
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    flex: 1,
                                    height: '6px',
                                    borderRadius: '3px',
                                    background: 'var(--border)',
                                    overflow: 'hidden',
                                    display: 'flex'
                                }}>
                                    {[
                                        pwdChecks.lengthOk,
                                        pwdChecks.hasUpper,
                                        pwdChecks.hasLower,
                                        pwdChecks.hasNumber
                                    ].map((ok, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                flex: 1,
                                                background: ok ? '#22c55e' : 'rgb(239, 68, 68)',
                                                transition: 'background 0.2s ease'
                                            }}
                                        />
                                    ))}
                                </div>
                                <span style={{ fontSize: '12px', color: pwdOk ? 'rgb(34, 197, 94)' : 'var(--text-secondary)', fontWeight: 500 }}>
                                    {pwdOk ? 'Acceptable' : 'Add requirements'}
                                </span>
                            </div>
                        </div>
                    </div>

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
