import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { api } from '../../../utils/api';
import AdminPageHeader from '../../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../../components/admin/ui/AdminButton';
import AdminInput from '../../../components/admin/ui/AdminInput';
import ImageUpload from '../../../components/admin/ui/ImageUpload';
import CardPreview from '../../../components/CardPreview';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

type VendorBrandingData = {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    card_text_color: string;
    card_style: 'SOLID' | 'GRADIENT' | 'GLASS';
    logo_url: string;
    wordmark_url: string;
    welcome_text: string;
};

type ColorPickerProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

const DEFAULT_BRANDING: VendorBrandingData = {
    primary_color: '#000000',
    secondary_color: '#ffffff',
    accent_color: '#3B82F6',
    background_color: '#121212',
    card_text_color: '#ffffff',
    card_style: 'SOLID',
    logo_url: '',
    wordmark_url: '',
    welcome_text: ''
};

const normalizeBranding = (value: Partial<VendorBrandingData> | null | undefined): VendorBrandingData => ({
    ...DEFAULT_BRANDING,
    ...value,
    primary_color: value?.primary_color || DEFAULT_BRANDING.primary_color,
    secondary_color: value?.secondary_color || DEFAULT_BRANDING.secondary_color,
    accent_color: value?.accent_color || DEFAULT_BRANDING.accent_color,
    background_color: value?.background_color || DEFAULT_BRANDING.background_color,
    card_text_color: value?.card_text_color || DEFAULT_BRANDING.card_text_color,
    card_style: value?.card_style || DEFAULT_BRANDING.card_style,
    logo_url: value?.logo_url || '',
    wordmark_url: value?.wordmark_url || '',
    welcome_text: value?.welcome_text || ''
});

const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || error.message || fallback;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => (
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
                    onChange={(e) => onChange(e.target.value)}
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
                onChange={(e) => onChange(e.target.value)}
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

const VendorBranding: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [branding, setBranding] = useState<VendorBrandingData>(DEFAULT_BRANDING);
    const initialDataRef = useRef<VendorBrandingData | null>(null);

    const fetchBranding = useCallback(async () => {
        if (!slug) return;

        setLoading(true);
        setError('');
        try {
            const res = await api.get<Partial<VendorBrandingData>>(`/api/v1/v/${slug}/admin/branding`);
            const brandingData = normalizeBranding(res.data);
            setBranding(brandingData);
            initialDataRef.current = { ...brandingData };
        } catch (loadError: unknown) {
            setError(getApiErrorMessage(loadError, 'Failed to load branding'));
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        void fetchBranding();
    }, [fetchBranding]);

    const isDirty = initialDataRef.current
        ? JSON.stringify(branding) !== JSON.stringify(initialDataRef.current)
        : false;

    useUnsavedChanges({
        isDirty,
        message: 'You have unsaved branding changes. Are you sure you want to leave?',
        saving
    });

    const updateBranding = <K extends keyof VendorBrandingData>(field: K, value: VendorBrandingData[K]) => {
        setBranding((current) => ({ ...current, [field]: value }));
    };

    const handleSave = async () => {
        if (!slug) return;

        setSaving(true);
        setError('');
        try {
            await api.put(`/api/v1/v/${slug}/admin/branding`, branding);
            initialDataRef.current = { ...branding };
        } catch (saveError: unknown) {
            setError(getApiErrorMessage(saveError, 'Failed to save branding'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10">Loading...</div>;

    return (
        <div className="branding-page fade-in">
            <AdminPageHeader
                title="Branding & Design"
                description="Customize your loyalty card appearance and customer welcome screen."
                actions={
                    <AdminButton onClick={handleSave} isLoading={saving} disabled={!isDirty || saving}>
                        Save Changes
                    </AdminButton>
                }
            />

            {error && (
                <div style={{
                    marginBottom: '20px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#fecaca'
                }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: '40px', alignItems: 'stretch', paddingBottom: '40px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="admin-card" style={{ padding: '24px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Card Appearance</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                            <ColorPicker
                                label="Primary"
                                value={branding.primary_color}
                                onChange={(value) => updateBranding('primary_color', value)}
                            />
                            <ColorPicker
                                label="Secondary"
                                value={branding.secondary_color}
                                onChange={(value) => updateBranding('secondary_color', value)}
                            />
                            <ColorPicker
                                label="Accent"
                                value={branding.accent_color}
                                onChange={(value) => updateBranding('accent_color', value)}
                            />
                            <ColorPicker
                                label="Screen Background"
                                value={branding.background_color}
                                onChange={(value) => updateBranding('background_color', value)}
                            />
                            <ColorPicker
                                label="Card Text"
                                value={branding.card_text_color}
                                onChange={(value) => updateBranding('card_text_color', value)}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <AdminInput
                                label="Card Style"
                                type="select"
                                value={branding.card_style}
                                onChange={(e) => updateBranding('card_style', e.target.value as VendorBrandingData['card_style'])}
                                options={[
                                    { value: 'SOLID', label: 'Solid' },
                                    { value: 'GRADIENT', label: 'Gradient' },
                                    { value: 'GLASS', label: 'Glass' }
                                ]}
                            />
                            <AdminInput
                                label="Welcome Text"
                                type="text"
                                value={branding.welcome_text}
                                onChange={(e) => updateBranding('welcome_text', e.target.value)}
                                placeholder="Welcome to your store"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <ImageUpload
                                label="Logo"
                                value={branding.logo_url || undefined}
                                onChange={(value) => updateBranding('logo_url', value)}
                            />
                            <ImageUpload
                                label="Wordmark"
                                value={branding.wordmark_url || undefined}
                                onChange={(value) => updateBranding('wordmark_url', value)}
                            />
                        </div>
                    </div>
                </div>

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
                            <div className="flex justify-between items-center mb-6">
                                <div className="text-white text-lg font-bold">
                                    {branding.wordmark_url ? (
                                        <img src={branding.wordmark_url} alt="Wordmark" style={{ height: '24px' }} />
                                    ) : (
                                        <span>Your Brand</span>
                                    )}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/10"></div>
                            </div>

                            <div style={{
                                marginBottom: '24px',
                                display: 'flex',
                                justifyContent: 'center',
                                width: '100%'
                            }}>
                                <div style={{ width: '100%', maxWidth: '260px' }}>
                                    <CardPreview
                                        branding={branding}
                                        program={{ stamps_required: 10, reward_title: 'Reward Preview' }}
                                        stampsCount={3}
                                    />
                                </div>
                            </div>

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
