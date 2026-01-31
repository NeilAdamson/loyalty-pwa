import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import AdminInput from '../../components/admin/ui/AdminInput';
import ImageUpload from '../../components/admin/ui/ImageUpload';
import CardPreview from '../../components/CardPreview';

export default function AdminVendorDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [vendor, setVendor] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Form States
    const [branding, setBranding] = useState<any>({});
    const [program, setProgram] = useState<any>({});
    const [details, setDetails] = useState<any>({});
    const [saving, setSaving] = useState(false);

    // Staff Management State
    const [staffList, setStaffList] = useState<any[]>([]);
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: '', pin: '' });

    useEffect(() => {
        if (id) {
            fetchVendor();
            fetchStaff();
        }
    }, [id]);

    const fetchStaff = async () => {
        try {
            const res = await api.get(`/api/v1/admin/vendors/${id}/staff`);
            setStaffList(res.data);
        } catch (e) {
            console.error('Failed to load staff', e);
        }
    }

    const handleAddStaff = async () => {
        if (!newStaff.name || !newStaff.pin) return alert('Name and PIN required');
        setSaving(true);
        try {
            await api.post(`/api/v1/admin/vendors/${id}/staff`, newStaff);
            alert('Staff member created');
            setIsAddingStaff(false);
            setNewStaff({ name: '', pin: '' });
            fetchStaff();
        } catch (e) {
            console.error(e);
            alert('Failed to create staff');
        } finally {
            setSaving(false);
        }
    }

    const fetchVendor = async () => {
        try {
            const res = await api.get(`/api/v1/admin/vendors/${id}`);
            const v = res.data.vendor || res.data;
            setVendor(v);

            // Separate branding, program and details for form
            const { branding: b, programs, ...rest } = v;
            setBranding(b || { primary_color: '#000000', secondary_color: '#ffffff', accent_color: '#3B82F6', card_text_color: '#ffffff', card_style: 'SOLID' });

            const activeProgram = programs?.find((p: any) => p.is_active) || {};
            setProgram({
                reward_title: activeProgram.reward_title || 'Free Reward',
                stamps_required: activeProgram.stamps_required || 10
            });

            setDetails({
                legal_name: rest.legal_name,
                trading_name: rest.trading_name,
                vendor_slug: rest.vendor_slug,
                billing_email: rest.billing_email,
                status: rest.status
            });
        } catch (error) {
            console.error("Failed to load vendor", error);
            navigate('/admin/vendors');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Clean up: explicitly send what we want to update
            const payload = {
                ...details,
                branding,
                program
            };
            await api.patch(`/api/v1/admin/vendors/${id}`, payload);
            alert('Updated successfully');
            fetchVendor(); // Refresh
        } catch (error) {
            console.error(error);
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this vendor? This action cannot be undone and will delete all associated data (members, cards, branch data).')) {
            return;
        }
        setSaving(true);
        try {
            await api.delete(`/api/v1/admin/vendors/${id}`);
            alert('Vendor deleted successfully');
            navigate('/admin/vendors');
        } catch (error) {
            console.error(error);
            alert('Failed to delete vendor');
            setSaving(false);
        }
    };

    // Helper for color input with preview
    const ColorPicker = ({ label, value, onChange }: any) => (
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: value || '#000000',
                    border: '2px solid rgba(255,255,255,0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    flexShrink: 0
                }}>
                    <input
                        type="color"
                        value={value || '#000000'}
                        onChange={e => onChange(e.target.value)}
                        style={{
                            opacity: 0,
                            position: 'absolute',
                            top: '-50%',
                            left: '-50%',
                            width: '200%',
                            height: '200%',
                            cursor: 'pointer'
                        }}
                    />
                </div>
                <input
                    type="text"
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder="#000000"
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        width: '100px',
                        fontFamily: 'monospace',
                        fontSize: '14px'
                    }}
                />
            </div>
        </div>
    );

    if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
    if (!vendor) return <div style={{ padding: 40 }}>Vendor not found</div>;

    return (
        <div>
            <AdminPageHeader
                title={`Manage: ${vendor.trading_name}`}
                description="Update branding, locations, and staff."
                actions={
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <AdminButton variant="secondary" onClick={() => navigate('/admin/vendors')}>
                            Back
                        </AdminButton>
                        <AdminButton onClick={handleSave} isLoading={saving}>
                            Save Changes
                        </AdminButton>
                    </div>
                }
            />

            <form onSubmit={handleSave} style={{
                display: 'flex',
                gap: '40px',
                alignItems: 'start',
                maxWidth: '1600px',
                margin: '0 auto',
                paddingBottom: '40px'
            }}>

                {/* LEFT MAIN CONTENT */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Top Row: Properties + Branding in a Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>

                        {/* Properties Card */}
                        <div className="admin-card" style={{ padding: '24px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                            <h3 style={{ marginBottom: '24px', fontSize: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Properties</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <AdminInput
                                    label="Trading Name"
                                    type="text"
                                    value={details.trading_name || ''}
                                    onChange={e => setDetails({ ...details, trading_name: e.target.value })}
                                />
                                <AdminInput
                                    label="Legal Name"
                                    type="text"
                                    value={details.legal_name || ''}
                                    onChange={e => setDetails({ ...details, legal_name: e.target.value })}
                                />
                                <AdminInput
                                    label="Slug (URL Path)"
                                    type="text"
                                    value={details.vendor_slug || ''}
                                    onChange={e => setDetails({ ...details, vendor_slug: e.target.value })}
                                />
                                <AdminInput
                                    label="Billing Email"
                                    type="email"
                                    value={details.billing_email || ''}
                                    onChange={e => setDetails({ ...details, billing_email: e.target.value })}
                                />
                                <AdminInput
                                    label="Status"
                                    type="select"
                                    value={details.status || 'ACTIVE'}
                                    onChange={e => setDetails({ ...details, status: e.target.value })}
                                    options={[
                                        { value: 'ACTIVE', label: 'Active' },
                                        { value: 'SUSPENDED', label: 'Suspended' },
                                        { value: 'TRIAL', label: 'Trial' }
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Branding Card */}
                        <div className="admin-card" style={{ padding: '24px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                            <h3 style={{ marginBottom: '24px', fontSize: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Branding Setup</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '12px' }}>
                                    <ColorPicker
                                        label="Primary"
                                        value={branding.primary_color}
                                        onChange={(val: string) => setBranding({ ...branding, primary_color: val })}
                                    />
                                    <ColorPicker
                                        label="Secondary"
                                        value={branding.secondary_color}
                                        onChange={(val: string) => setBranding({ ...branding, secondary_color: val })}
                                    />
                                    <ColorPicker
                                        label="Accent"
                                        value={branding.accent_color}
                                        onChange={(val: string) => setBranding({ ...branding, accent_color: val })}
                                    />
                                    <ColorPicker
                                        label="Background"
                                        value={branding.background_color}
                                        onChange={(val: string) => setBranding({ ...branding, background_color: val })}
                                    />
                                    <ColorPicker
                                        label="Text"
                                        value={branding.card_text_color}
                                        onChange={(val: string) => setBranding({ ...branding, card_text_color: val })}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <AdminInput
                                        label="Reward Title"
                                        type="text"
                                        value={program.reward_title || ''}
                                        onChange={e => setProgram({ ...program, reward_title: e.target.value })}
                                    />
                                    <AdminInput
                                        label="Stamps Req."
                                        type="number"
                                        value={program.stamps_required || 10}
                                        onChange={e => setProgram({ ...program, stamps_required: parseInt(e.target.value) })}
                                        min="2"
                                        max="30"
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <ImageUpload
                                        label="Logo"
                                        value={branding.logo_url}
                                        onChange={(val) => setBranding({ ...branding, logo_url: val })}
                                    />
                                    <ImageUpload
                                        label="Wordmark"
                                        value={branding.wordmark_url}
                                        onChange={(val) => setBranding({ ...branding, wordmark_url: val })}
                                    />
                                </div>

                                <AdminInput
                                    label="Welcome Text"
                                    type="text"
                                    value={branding.welcome_text || ''}
                                    onChange={e => setBranding({ ...branding, welcome_text: e.target.value })}
                                />
                                <AdminInput
                                    label="Card Style"
                                    type="select"
                                    value={branding.card_style || 'SOLID'}
                                    onChange={e => setBranding({ ...branding, card_style: e.target.value })}
                                    options={[
                                        { value: 'SOLID', label: 'Solid' },
                                        { value: 'GRADIENT', label: 'Gradient' },
                                        { value: 'GLASS', label: 'Glass' }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Staff Management - Full Width */}
                    <div className="admin-card" style={{ padding: '24px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                            <h3 style={{ fontSize: '18px', margin: 0 }}>Staff Access</h3>
                            <AdminButton type="button" onClick={() => setIsAddingStaff(true)} style={{ fontSize: '14px', padding: '8px 16px' }}>
                                + Add Staff
                            </AdminButton>
                        </div>

                        {isAddingStaff && (
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 16px 0' }}>New Staff Member</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                                    <AdminInput
                                        label="Name"
                                        type="text"
                                        value={newStaff.name}
                                        onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                                        placeholder="e.g. Alice"
                                    />
                                    <AdminInput
                                        label="PIN Code"
                                        type="text"
                                        value={newStaff.pin}
                                        onChange={e => setNewStaff({ ...newStaff, pin: e.target.value })}
                                        placeholder="e.g. 1234"
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <AdminButton type="button" onClick={handleAddStaff} isLoading={saving}>Create</AdminButton>
                                        <AdminButton type="button" variant="secondary" onClick={() => setIsAddingStaff(false)}>Cancel</AdminButton>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Name</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Staff ID (Username)</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Activity</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Role</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffList.map((s: any) => (
                                        <tr key={s.staff_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ fontWeight: 500 }}>{s.name}</div>
                                                {s.status !== 'ENABLED' && <span style={{ fontSize: '11px', color: 'red' }}>DISABLED</span>}
                                            </td>
                                            <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                                                {s.staff_id}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(s.staff_id);
                                                        alert('Copied Staff ID');
                                                    }}
                                                    style={{
                                                        marginLeft: '8px',
                                                        background: 'none',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '4px',
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        padding: '2px 6px',
                                                        fontSize: '10px'
                                                    }}
                                                >
                                                    COPY
                                                </button>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <span>🏆 {s._count?.stamp_txs || 0} Stamps</span>
                                                    <span style={{ opacity: 0.5 }}>|</span>
                                                    <span>🎁 {s._count?.redeem_txs || 0} Redeems</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>{s.role}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                                                {new Date(s.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {staffList.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>
                                                No staff members found. Add one to enable POS access.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Main Actions Footer */}
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <AdminButton type="submit" isLoading={saving} style={{ flex: 1, padding: '14px', fontSize: '16px' }}>
                            Save Changes
                        </AdminButton>

                        <AdminButton
                            type="button"
                            variant="danger"
                            isLoading={saving}
                            onClick={handleDelete}
                            style={{ padding: '14px', fontSize: '16px' }}
                        >
                            Delete Vendor
                        </AdminButton>
                    </div>

                </div>

                {/* RIGHT SIDEBAR (Preview) */}
                <div style={{ width: '350px', flexShrink: 0 }}>
                    <div style={{
                        position: 'sticky',
                        top: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            width: '300px',
                            height: '560px',
                            background: branding.background_color || '#121212',
                            border: '10px solid #2a2a2a',
                            borderRadius: '36px',
                            overflow: 'hidden',
                            position: 'relative',
                            padding: '20px',
                            boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'background 0.3s ease'
                        }}>
                            {/* Status Bar Mock */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', height: '14px', marginBottom: '20px', opacity: 0.5 }}>
                                <span style={{ fontSize: '10px', color: '#fff' }}>9:41</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <div style={{ width: '12px', height: '10px', background: '#fff', borderRadius: '2px' }}></div>
                                    <div style={{ width: '12px', height: '10px', background: '#fff', borderRadius: '2px' }}></div>
                                </div>
                            </div>

                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '0 0 20px 0' }}>
                                {details.trading_name || 'Vendor Name'}
                            </h2>

                            <CardPreview
                                branding={branding}
                                program={{
                                    stamps_required: Number(program.stamps_required || 10),
                                    reward_title: program.reward_title
                                }}
                                stampsCount={3}
                            />

                            <div style={{
                                marginTop: 'auto',
                                background: '#fff',
                                padding: '16px',
                                borderRadius: '16px',
                                textAlign: 'center',
                                color: '#000'
                            }}>
                                <div style={{ width: '100px', height: '100px', background: '#000', margin: '0 auto' }}></div>
                                <p style={{ fontSize: '12px', marginTop: '8px' }}>Scan to get stamped</p>
                            </div>
                        </div>

                        <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px', lineHeight: '1.5' }}>
                            Interactive Live Preview
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
