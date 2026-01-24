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

    useEffect(() => {
        if (id) fetchVendor();
    }, [id]);

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
                <div style={{ position: 'relative', width: '50px', height: '50px' }}>
                    <input
                        type="color"
                        value={value || '#000000'}
                        onChange={e => onChange(e.target.value)}
                        style={{
                            width: '100%',
                            height: '100%',
                            padding: 0,
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            position: 'absolute',
                            top: 0,
                            left: 0
                        }}
                    />
                    {/* Overlay to ensure border radius is visible if browser applies weird constraints */}
                    <div style={{
                        pointerEvents: 'none',
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px'
                    }} />
                </div>
                <div style={{
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    background: 'var(--bg-secondary, #222)',
                    padding: '4px 8px',
                    borderRadius: '4px'
                }}>
                    {value || '#000000'}
                </div>
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
                    <AdminButton variant="secondary" onClick={() => navigate('/admin/vendors')}>
                        Back
                    </AdminButton>
                }
            />

            <form onSubmit={handleSave} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '30px',
                alignItems: 'start'
            }}>

                {/* Column 1: Properties */}
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

                {/* Column 2: Branding Controls */}
                <div className="admin-card" style={{ padding: '24px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '24px', fontSize: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Branding Setup</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <ColorPicker
                                label="Primary Color"
                                value={branding.primary_color}
                                onChange={(val: string) => setBranding({ ...branding, primary_color: val })}
                            />
                            <ColorPicker
                                label="Secondary Color"
                                value={branding.secondary_color}
                                onChange={(val: string) => setBranding({ ...branding, secondary_color: val })}
                            />
                            <ColorPicker
                                label="Accent Color"
                                value={branding.accent_color}
                                onChange={(val: string) => setBranding({ ...branding, accent_color: val })}
                            />
                            <ColorPicker
                                label="Background Color"
                                value={branding.background_color}
                                onChange={(val: string) => setBranding({ ...branding, background_color: val })}
                            />
                            <ColorPicker
                                label="Card Text Color"
                                value={branding.card_text_color}
                                onChange={(val: string) => setBranding({ ...branding, card_text_color: val })}
                            />
                        </div>

                        <AdminInput
                            label="Reward Title (Text on Card)"
                            type="text"
                            value={program.reward_title || ''}
                            onChange={e => setProgram({ ...program, reward_title: e.target.value })}
                        />

                        <AdminInput
                            label="Stamps Required"
                            type="number"
                            value={program.stamps_required || 10}
                            onChange={e => setProgram({ ...program, stamps_required: parseInt(e.target.value) })}
                            min="2"
                            max="30"
                        />

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
                        <AdminInput
                            label="Welcome Text (Optional Header)"
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

                {/* Column 3: Preview (Right) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                        position: 'sticky',
                        top: '20px',
                        display: 'flex', // Re-add flex
                        flexDirection: 'column', // align box
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

                {/* Footer Actions */}
                <div style={{ gridColumn: '1 / -1', marginTop: '10px', display: 'flex', gap: '20px' }}>
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
            </form>
        </div>
    );
}
