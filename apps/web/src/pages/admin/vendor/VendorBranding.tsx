import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../utils/api';
import AdminPageHeader from '../../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../../components/admin/ui/AdminButton';
import AdminInput from '../../../components/admin/ui/AdminInput';
import ImageUpload from '../../../components/admin/ui/ImageUpload';
import CardPreview from '../../../components/CardPreview';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

const VendorBranding: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [branding, setBranding] = useState<any>({});
    const [program, setProgram] = useState<any>({});
    const initialDataRef = useRef<{ branding: any; program: any } | null>(null);

    useEffect(() => {
        fetchBranding();
    }, [slug]);

    const fetchBranding = async () => {
        try {
            // Fetch branding
            const res = await api.get(`/api/v1/v/${slug}/admin/branding`);
            const brandingData = res.data || {
                primary_color: '#000000',
                secondary_color: '#ffffff',
                accent_color: '#3B82F6',
                card_text_color: '#ffffff',
                card_style: 'SOLID'
            };
            setBranding(brandingData);

            // Fetch current program for reward title/stamps (optionally)
            // The API we built updates program if fields are sent.
            // We should ideally fetch the program too to pre-fill.
            // Let's assume the GET branding endpoint *could* return program details or we fetch program separately.
            // For now, let's fetch the program to populate those fields.
            const progRes = await api.get(`/api/v1/v/${slug}/program`);
            const programData = progRes.data ? {
                reward_title: progRes.data.reward_title,
                stamps_required: progRes.data.stamps_required
            } : {};
            setProgram(programData);

            // Store initial state for dirty checking
            initialDataRef.current = {
                branding: JSON.parse(JSON.stringify(brandingData)),
                program: JSON.parse(JSON.stringify(programData))
            };
        } catch (error) {
            console.error('Failed to load branding', error);
        } finally {
            setLoading(false);
        }
    };

    // Check if form is dirty (has unsaved changes)
    const isDirty = initialDataRef.current ? (
        JSON.stringify(branding) !== JSON.stringify(initialDataRef.current.branding) ||
        JSON.stringify(program) !== JSON.stringify(initialDataRef.current.program)
    ) : false;

    // Block navigation if there are unsaved changes (but not during save)
    useUnsavedChanges({ isDirty, message: 'You have unsaved branding changes. Are you sure you want to leave?', saving: saving });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...branding,
                reward_title: program.reward_title,
                stamps_required: Number(program.stamps_required)
            };

            await api.put(`/api/v1/v/${slug}/admin/branding`, payload);
            
            // Update initial data ref after successful save
            initialDataRef.current = {
                branding: JSON.parse(JSON.stringify(branding)),
                program: JSON.parse(JSON.stringify(program))
            };
            
            alert('Branding updated successfully');
        } catch (error: any) {
            console.error('Branding save error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to save branding';
            alert(`Failed to save branding: ${errorMessage}`);
        } finally {
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

    if (loading) return <div className="p-10">Loading...</div>;

    return (
        <div className="branding-page fade-in">
            <AdminPageHeader
                title="Branding & Design"
                description="Customize your loyalty card and customer experience."
                actions={
                    <AdminButton onClick={handleSave} isLoading={saving} disabled={!isDirty || saving}>
                        Save Changes
                    </AdminButton>
                }
            />

            <div style={{ display: 'flex', gap: '40px', alignItems: 'stretch', paddingBottom: '40px' }}>
                {/* Left: Settings Form */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="admin-card" style={{ padding: '24px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Card Appearance</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                            <ColorPicker
                                label="Primary (Card Background)"
                                value={branding.primary_color}
                                onChange={(val: string) => setBranding({ ...branding, primary_color: val })}
                            />
                            <ColorPicker
                                label="Secondary (Gradient End)"
                                value={branding.secondary_color}
                                onChange={(val: string) => setBranding({ ...branding, secondary_color: val })}
                            />
                            <ColorPicker
                                label="Accent (Stamps)"
                                value={branding.accent_color}
                                onChange={(val: string) => setBranding({ ...branding, accent_color: val })}
                            />
                            <ColorPicker
                                label="Background (App Screen)"
                                value={branding.background_color}
                                onChange={(val: string) => setBranding({ ...branding, background_color: val })}
                            />
                            <ColorPicker
                                label="Text Color"
                                value={branding.card_text_color}
                                onChange={(val: string) => setBranding({ ...branding, card_text_color: val })}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
                            <AdminInput
                                label="Welcome Text"
                                type="text"
                                value={branding.welcome_text || ''}
                                onChange={e => setBranding({ ...branding, welcome_text: e.target.value })}
                                placeholder="e.g. Welcome to [Store Name]"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <ImageUpload
                                label="Logo (Square/Icon)"
                                value={branding.logo_url}
                                onChange={(val) => setBranding({ ...branding, logo_url: val })}
                            />
                            <ImageUpload
                                label="Wordmark (Horizontal)"
                                value={branding.wordmark_url}
                                onChange={(val) => setBranding({ ...branding, wordmark_url: val })}
                            />
                        </div>
                    </div>

                    <div className="admin-card" style={{ padding: '24px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Program Details</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <AdminInput
                                label="Reward Title"
                                type="text"
                                value={program.reward_title || ''}
                                onChange={e => setProgram({ ...program, reward_title: e.target.value })}
                                placeholder="e.g. Free Coffee"
                            />
                            <AdminInput
                                label="Stamps Required"
                                type="number"
                                value={program.stamps_required ?? 10}
                                onChange={e => setProgram({ ...program, stamps_required: e.target.value })}
                                min={2}
                                max={30}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Live Preview */}
                <div style={{
                    width: '350px',
                    flexShrink: 0,
                    minHeight: 0,
                    borderLeft: '1px solid var(--border)',
                    paddingLeft: '24px'
                }}>
                    <div style={{
                        position: 'sticky',
                        top: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Live Preview</h4>
                        <div style={{
                            width: '300px',
                            height: '560px',
                            background: branding.background_color || '#121212',
                            border: '10px solid #2a2a2a',
                            borderRadius: '36px',
                            overflow: 'hidden',
                            overflowY: 'auto',
                            scrollbarWidth: 'none',
                            position: 'relative',
                            padding: '20px',
                            boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'background 0.3s ease'
                        }}>
                            {/* Mock Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="text-white text-lg font-bold">
                                    {branding.wordmark_url ? (
                                        <img src={branding.wordmark_url} alt="Logo" style={{ height: '24px' }} />
                                    ) : (
                                        <span>Your Brand</span>
                                    )}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/10"></div>
                            </div>

                            {/* Live Card Preview */}
                            <div style={{ 
                                marginBottom: '24px', 
                                display: 'flex', 
                                justifyContent: 'center',
                                width: '100%'
                            }}>
                                <div style={{ width: '100%', maxWidth: '260px' }}>
                                    <CardPreview
                                        branding={branding}
                                        program={program.stamps_required ? program : { stamps_required: 10, reward_title: program.reward_title || 'Reward' }}
                                        stampsCount={Math.min(3, program.stamps_required || 10)}
                                    />
                                </div>
                            </div>

                            {/* QR Code Section */}
                            <div style={{
                                marginTop: 'auto',
                                background: '#fff',
                                padding: '16px',
                                borderRadius: '16px',
                                textAlign: 'center',
                                color: '#000',
                                marginBottom: '16px'
                            }}>
                                <div style={{ width: '100px', height: '100px', background: '#000', margin: '0 auto', borderRadius: '8px' }}></div>
                                <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>Scan to get stamped</p>
                            </div>

                            <div className="text-center text-white/50 text-xs">
                                Preview Only
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorBranding;
