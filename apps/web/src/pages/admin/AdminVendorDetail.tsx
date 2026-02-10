import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import AdminInput from '../../components/admin/ui/AdminInput';
import ImageUpload from '../../components/admin/ui/ImageUpload';
import CardPreview from '../../components/CardPreview';

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
    const [newStaff, setNewStaff] = useState({ name: '', username: '', pin: '' });
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const [editStaffForm, setEditStaffForm] = useState<{ name: string; username: string; pin: string; role: string; branch_id: string; status: string }>({ name: '', username: '', pin: '', role: 'STAMPER', branch_id: '', status: 'ENABLED' });

    // Validation
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
        if (!newStaff.name || !newStaff.username || !newStaff.pin) return alert('Name, username and PIN required');
        setSaving(true);
        try {
            await api.post(`/api/v1/admin/vendors/${id}/staff`, newStaff);
            alert('Staff member created');
            setIsAddingStaff(false);
            setNewStaff({ name: '', username: '', pin: '' });
            fetchStaff();
        } catch (e) {
            console.error(e);
            alert('Failed to create staff');
        } finally {
            setSaving(false);
        }
    }

    const openEditStaff = (s: any) => {
        setEditingStaffId(s.staff_id);
        setEditStaffForm({
            name: s.name || '',
            username: s.username || '',
            pin: '',
            role: s.role || 'STAMPER',
            branch_id: s.branch_id || '',
            status: s.status || 'ENABLED'
        });
        setIsAddingStaff(false);
    }

    const closeEditStaff = () => {
        setEditingStaffId(null);
        setEditStaffForm({ name: '', username: '', pin: '', role: 'STAMPER', branch_id: '', status: 'ENABLED' });
    }

    const handleSaveEditStaff = async () => {
        if (!editingStaffId || !editStaffForm.name?.trim() || !editStaffForm.username?.trim()) {
            alert('Name and username are required');
            return;
        }
        setSaving(true);
        try {
            const body: any = {
                name: editStaffForm.name.trim(),
                username: editStaffForm.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                role: editStaffForm.role,
                branch_id: editStaffForm.branch_id || undefined,
                status: editStaffForm.status
            };
            if (editStaffForm.pin.trim()) body.pin = editStaffForm.pin.trim();
            await api.patch(`/api/v1/admin/vendors/${id}/staff/${editingStaffId}`, body);
            alert('Staff updated');
            closeEditStaff();
            fetchStaff();
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to update staff');
        } finally {
            setSaving(false);
        }
    }

    const handleDeleteStaff = async (s: any) => {
        if (!window.confirm(`Delete staff member "${s.name}"? They will no longer be able to log in.`)) return;
        setSaving(true);
        try {
            await api.delete(`/api/v1/admin/vendors/${id}/staff/${s.staff_id}`);
            alert('Staff deleted');
            if (editingStaffId === s.staff_id) closeEditStaff();
            fetchStaff();
        } catch (e: any) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to delete staff');
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
                status: rest.status,
                branch_city: rest.branches?.[0]?.city || '',
                branch_region: rest.branches?.[0]?.region || '',
                monthly_billing_amount: rest.monthly_billing_amount,
                billing_start_date: rest.billing_start_date ? new Date(rest.billing_start_date).toISOString().split('T')[0] : '',
                contact_name: rest.contact_name,
                contact_surname: rest.contact_surname,
                contact_phone: typeof rest.contact_phone === 'string' ? formatContactPhone(rest.contact_phone) : (rest.contact_phone ? formatContactPhone(String(rest.contact_phone)) : '')
            });
        } catch (error) {
            console.error("Failed to load vendor", error);
            navigate('/admin/vendors');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = (): boolean => {
        const err: Record<string, string> = {};
        if (!details.legal_name?.trim()) err.legal_name = 'Please enter legal name';
        if (!details.trading_name?.trim()) err.trading_name = 'Please enter trading name';
        if (!details.vendor_slug?.trim()) err.vendor_slug = 'Please enter URL slug';
        else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(details.vendor_slug)) {
            err.vendor_slug = 'Slug can only contain lowercase letters, numbers and hyphens';
        }
        if (!details.contact_name?.trim()) err.contact_name = 'Please enter contact name';
        if (!details.contact_surname?.trim()) err.contact_surname = 'Please enter contact surname';
        const phoneDigits = contactPhoneDigits(details.contact_phone || '');
        if (!phoneDigits) err.contact_phone = 'Please enter contact number (e.g. 082 123 4567)';
        else if (phoneDigits.length !== 10) err.contact_phone = 'Contact number must be 10 digits';
        if (!details.billing_email?.trim()) err.billing_email = 'Please enter billing email';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.billing_email)) {
            err.billing_email = 'Please enter a valid email address';
        }
        if (!details.monthly_billing_amount?.toString().trim()) err.monthly_billing_amount = 'Please enter monthly billing amount';
        if (!details.billing_start_date?.trim()) err.billing_start_date = 'Please select billing start date';
        if (!program.reward_title?.trim()) err.reward_title = 'Please enter reward title';
        const sr = parseInt(program.stamps_required, 10);
        if (Number.isNaN(sr) || sr < 2 || sr > 30) err.stamps_required = 'Stamps required must be between 2 and 30';

        setFieldErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        if (!validateForm()) return;

        setSaving(true);
        try {
            const payload = {
                ...details,
                contact_phone: contactPhoneDigits(details.contact_phone || ''),
                monthly_billing_amount: details.monthly_billing_amount ? Number(details.monthly_billing_amount) : 0,
                branding,
                program: {
                    ...program,
                    stamps_required: parseInt(program.stamps_required, 10) || 10
                }
            };
            await api.patch(`/api/v1/admin/vendors/${id}`, payload);
            alert('Updated successfully');
            fetchVendor();
        } catch (error: any) {
            console.error(error);
            const res = error.response?.data;
            const detailsObj = res?.details as Record<string, string> | undefined;
            if (detailsObj && typeof detailsObj === 'object') {
                setFieldErrors(detailsObj);
                alert(res?.message || Object.values(detailsObj)[0] || 'Failed to save');
            } else {
                alert(res?.message || error.message || 'Failed to save');
            }
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
        <div style={{ marginBottom: '12px', minWidth: 0 }}>
            <label
                style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                    lineHeight: 1.3,
                    textAlign: 'left',
                    whiteSpace: 'normal'
                }}
            >
                {label}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        padding: '6px 8px',
                        width: '86px',
                        fontFamily: 'monospace',
                        fontSize: '12px'
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
                alignItems: 'stretch',
                maxWidth: '1600px',
                margin: '0 auto',
                paddingBottom: '40px'
            }}>
                {/* LEFT MAIN CONTENT - scrollable form */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {Object.keys(fieldErrors).length > 0 && (
                        <div style={{
                            padding: '12px 20px',
                            background: 'rgba(255, 77, 77, 0.1)',
                            color: 'var(--danger)',
                            borderRadius: 'var(--radius)',
                            fontSize: '14px',
                            border: '1px solid var(--danger)'
                        }}>
                            {Object.values(fieldErrors)[0]}
                        </div>
                    )}

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
                                    error={fieldErrors.trading_name}
                                    required
                                />
                                <AdminInput
                                    label="Legal Name"
                                    type="text"
                                    value={details.legal_name || ''}
                                    onChange={e => setDetails({ ...details, legal_name: e.target.value })}
                                    error={fieldErrors.legal_name}
                                    required
                                />
                                <AdminInput
                                    label="Slug (URL Path)"
                                    type="text"
                                    value={details.vendor_slug || ''}
                                    onChange={e => setDetails({ ...details, vendor_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                    error={fieldErrors.vendor_slug}
                                    required
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

                                <h4 style={{ fontSize: '14px', margin: '12px 0 8px 0', opacity: 0.7 }}>Contact Person</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <AdminInput
                                        label="Name"
                                        type="text"
                                        value={details.contact_name || ''}
                                        onChange={e => setDetails({ ...details, contact_name: e.target.value })}
                                        error={fieldErrors.contact_name}
                                        required
                                    />
                                    <AdminInput
                                        label="Surname"
                                        type="text"
                                        value={details.contact_surname || ''}
                                        onChange={e => setDetails({ ...details, contact_surname: e.target.value })}
                                        error={fieldErrors.contact_surname}
                                        required
                                    />
                                </div>
                                <AdminInput
                                    label="Telephone Number"
                                    type="text"
                                    placeholder="082 123 4567"
                                    maxLength={12}
                                    value={details.contact_phone || ''}
                                    onChange={e => setDetails({ ...details, contact_phone: formatContactPhone(e.target.value) })}
                                    error={fieldErrors.contact_phone}
                                    required
                                />

                                <h4 style={{ fontSize: '14px', margin: '20px 0 8px 0', opacity: 0.7 }}>Location</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <AdminInput
                                        label="Branch (Region)"
                                        type="text"
                                        value={details.branch_region || ''}
                                        onChange={e => setDetails({ ...details, branch_region: e.target.value })}
                                    />
                                    <AdminInput
                                        label="City"
                                        type="text"
                                        value={details.branch_city || ''}
                                        onChange={e => setDetails({ ...details, branch_city: e.target.value })}
                                    />
                                </div>

                                <h4 style={{ fontSize: '14px', margin: '20px 0 8px 0', opacity: 0.7 }}>Billing Setup</h4>
                                <AdminInput
                                    label="Billing Email"
                                    type="email"
                                    value={details.billing_email || ''}
                                    onChange={e => setDetails({ ...details, billing_email: e.target.value })}
                                    error={fieldErrors.billing_email}
                                    required
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <AdminInput
                                        label="Monthly Billing (R)"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={details.monthly_billing_amount ?? ''}
                                        onChange={e => setDetails({ ...details, monthly_billing_amount: e.target.value })}
                                        error={fieldErrors.monthly_billing_amount}
                                        required
                                    />
                                    <AdminInput
                                        label="Billing Start Date"
                                        type="date"
                                        value={details.billing_start_date || ''}
                                        onChange={e => setDetails({ ...details, billing_start_date: e.target.value })}
                                        error={fieldErrors.billing_start_date}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Branding Card */}
                        <div className="admin-card" style={{ padding: '24px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                            <h3 style={{ marginBottom: '24px', fontSize: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Branding Setup</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                                    <ColorPicker
                                        label="Primary (card background)"
                                        value={branding.primary_color}
                                        onChange={(val: string) => setBranding({ ...branding, primary_color: val })}
                                    />
                                    <ColorPicker
                                        label="Secondary (gradient end)"
                                        value={branding.secondary_color}
                                        onChange={(val: string) => setBranding({ ...branding, secondary_color: val })}
                                    />
                                    <ColorPicker
                                        label="Accent (stamps)"
                                        value={branding.accent_color}
                                        onChange={(val: string) => setBranding({ ...branding, accent_color: val })}
                                    />
                                    <ColorPicker
                                        label="Background (screen)"
                                        value={branding.background_color}
                                        onChange={(val: string) => setBranding({ ...branding, background_color: val })}
                                    />
                                    <ColorPicker
                                        label="Text (card labels)"
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
                                        error={fieldErrors.reward_title}
                                        required
                                    />
                                    <AdminInput
                                        label="Stamps Req."
                                        type="number"
                                        value={program.stamps_required ?? 10}
                                        onChange={e => setProgram({ ...program, stamps_required: e.target.value })}
                                        min={2}
                                        max={30}
                                        error={fieldErrors.stamps_required}
                                        required
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
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                                    <AdminInput
                                        label="Name"
                                        type="text"
                                        value={newStaff.name}
                                        onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                                        placeholder="e.g. Alice"
                                    />
                                    <AdminInput
                                        label="Username (for login)"
                                        type="text"
                                        value={newStaff.username}
                                        onChange={e => setNewStaff({ ...newStaff, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                                        placeholder="e.g. alice"
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

                        {editingStaffId && (
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 16px 0' }}>Edit Staff Member</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
                                    <AdminInput
                                        label="Name"
                                        type="text"
                                        value={editStaffForm.name}
                                        onChange={e => setEditStaffForm({ ...editStaffForm, name: e.target.value })}
                                        placeholder="e.g. Alice"
                                    />
                                    <AdminInput
                                        label="Username (for login)"
                                        type="text"
                                        value={editStaffForm.username}
                                        onChange={e => setEditStaffForm({ ...editStaffForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                                        placeholder="e.g. alice"
                                    />
                                    <AdminInput
                                        label="New PIN (leave blank to keep current)"
                                        type="text"
                                        value={editStaffForm.pin}
                                        onChange={e => setEditStaffForm({ ...editStaffForm, pin: e.target.value })}
                                        placeholder="e.g. 1234"
                                    />
                                    <AdminInput
                                        label="Role"
                                        type="select"
                                        value={editStaffForm.role}
                                        onChange={e => setEditStaffForm({ ...editStaffForm, role: e.target.value })}
                                        options={[
                                            { value: 'STAMPER', label: 'Stamper' },
                                            { value: 'ADMIN', label: 'Admin' }
                                        ]}
                                    />
                                    <AdminInput
                                        label="Branch"
                                        type="select"
                                        value={editStaffForm.branch_id}
                                        onChange={e => setEditStaffForm({ ...editStaffForm, branch_id: e.target.value })}
                                        options={[
                                            { value: '', label: '— Select —' },
                                            ...(vendor?.branches || []).map((b: any) => ({ value: b.branch_id, label: b.name || b.city || b.branch_id?.slice(0, 8) }))
                                        ]}
                                    />
                                    <AdminInput
                                        label="Status"
                                        type="select"
                                        value={editStaffForm.status}
                                        onChange={e => setEditStaffForm({ ...editStaffForm, status: e.target.value })}
                                        options={[
                                            { value: 'ENABLED', label: 'Enabled' },
                                            { value: 'DISABLED', label: 'Disabled' }
                                        ]}
                                    />
                                    <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1' }}>
                                        <AdminButton type="button" onClick={handleSaveEditStaff} isLoading={saving}>Save</AdminButton>
                                        <AdminButton type="button" variant="secondary" onClick={closeEditStaff}>Cancel</AdminButton>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Name</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Username</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Activity</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Role</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Joined</th>
                                        <th style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffList.map((s: any) => (
                                        <tr key={s.staff_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ fontWeight: 500 }}>{s.name}</div>
                                                {s.status !== 'ENABLED' && <span style={{ fontSize: '11px', color: 'red' }}>DISABLED</span>}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {s.username}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(s.username);
                                                        alert('Copied username');
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
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <AdminButton type="button" variant="secondary" onClick={() => openEditStaff(s)} style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                        Edit
                                                    </AdminButton>
                                                    <AdminButton type="button" variant="danger" onClick={() => handleDeleteStaff(s)} style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                        Delete
                                                    </AdminButton>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {staffList.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>
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

                {/* RIGHT SIDEBAR (Preview) - stretches to form height so sticky preview stays visible while scrolling */}
                <div style={{
                    width: '350px',
                    flexShrink: 0,
                    minHeight: 0,
                    borderLeft: '1px solid var(--border, rgba(255,255,255,0.08))',
                    paddingLeft: '24px'
                }}>
                    <div style={{
                        position: 'sticky',
                        top: '24px',
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
