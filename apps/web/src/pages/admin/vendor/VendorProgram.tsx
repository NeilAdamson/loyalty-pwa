import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { api } from '../../../utils/api';
import AdminButton from '../../../components/admin/ui/AdminButton';
import AdminInput from '../../../components/admin/ui/AdminInput';
import AdminPageHeader from '../../../components/admin/ui/AdminPageHeader';
import CardPreview from '../../../components/CardPreview';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

type ProgramForm = {
    stamps_required: number;
    reward_title: string;
    reward_description: string;
    terms_text: string;
};

type ProgramRecord = ProgramForm & {
    program_id: string;
    version: number;
    is_active: boolean;
    created_at: string;
    cards_count?: number;
};

type ProgramResponse = {
    active_program: ProgramRecord | null;
    created_version?: boolean;
    history: ProgramRecord[];
};

type BrandingPreview = {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    card_text_color?: string;
    card_style?: string;
    logo_url?: string;
};

type FieldErrors = Partial<Record<keyof ProgramForm, string>>;

const DEFAULT_PROGRAM: ProgramForm = {
    stamps_required: 10,
    reward_title: 'Free Reward',
    reward_description: 'Collect stamps to earn this reward.',
    terms_text: 'Standard terms and conditions apply.'
};

const DEFAULT_BRANDING: BrandingPreview = {
    primary_color: '#000000',
    secondary_color: '#ffffff',
    accent_color: '#3B82F6',
    card_text_color: '#ffffff',
    card_style: 'SOLID'
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || error.message || fallback;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

const toProgramForm = (program: ProgramRecord | null | undefined): ProgramForm => ({
    stamps_required: program?.stamps_required || DEFAULT_PROGRAM.stamps_required,
    reward_title: program?.reward_title || DEFAULT_PROGRAM.reward_title,
    reward_description: program?.reward_description || DEFAULT_PROGRAM.reward_description,
    terms_text: program?.terms_text || DEFAULT_PROGRAM.terms_text
});

const formatDateTime = (value: string): string =>
    new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(value));

const validateProgram = (program: ProgramForm): FieldErrors => {
    const errors: FieldErrors = {};
    if (!Number.isInteger(program.stamps_required) || program.stamps_required < 2 || program.stamps_required > 30) {
        errors.stamps_required = 'Use a whole number between 2 and 30';
    }
    if (!program.reward_title.trim()) errors.reward_title = 'Reward title is required';
    if (program.reward_title.trim().length > 80) errors.reward_title = 'Maximum 80 characters';
    if (!program.reward_description.trim()) errors.reward_description = 'Reward description is required';
    if (program.reward_description.trim().length > 240) errors.reward_description = 'Maximum 240 characters';
    if (!program.terms_text.trim()) errors.terms_text = 'Terms are required';
    if (program.terms_text.trim().length > 500) errors.terms_text = 'Maximum 500 characters';
    return errors;
};

const textareaStyle: React.CSSProperties = {
    minHeight: '110px',
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius)',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical'
};

const fieldLabelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)'
};

const VendorProgram: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [program, setProgram] = useState<ProgramForm>(DEFAULT_PROGRAM);
    const [activeProgram, setActiveProgram] = useState<ProgramRecord | null>(null);
    const [history, setHistory] = useState<ProgramRecord[]>([]);
    const [branding, setBranding] = useState<BrandingPreview>(DEFAULT_BRANDING);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const initialProgramRef = useRef<ProgramForm | null>(null);

    const loadProgram = useCallback(async () => {
        if (!slug) return;

        setLoading(true);
        setError('');
        try {
            const [programRes, brandingRes] = await Promise.all([
                api.get<ProgramResponse>(`/api/v1/v/${slug}/admin/program`),
                api.get<BrandingPreview>(`/api/v1/v/${slug}/admin/branding`)
            ]);

            const currentProgram = toProgramForm(programRes.data.active_program);
            setProgram(currentProgram);
            setActiveProgram(programRes.data.active_program);
            setHistory(programRes.data.history || []);
            setBranding({ ...DEFAULT_BRANDING, ...brandingRes.data });
            initialProgramRef.current = { ...currentProgram };
        } catch (loadError: unknown) {
            setError(getApiErrorMessage(loadError, 'Failed to load program'));
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        void loadProgram();
    }, [loadProgram]);

    const fieldErrors = useMemo(() => validateProgram(program), [program]);
    const hasValidationErrors = Object.keys(fieldErrors).length > 0;
    const isDirty = initialProgramRef.current
        ? JSON.stringify(program) !== JSON.stringify(initialProgramRef.current)
        : false;

    useUnsavedChanges({
        isDirty,
        message: 'You have unsaved program changes. Are you sure you want to leave?',
        saving
    });

    const updateProgram = <K extends keyof ProgramForm>(field: K, value: ProgramForm[K]) => {
        setProgram((current) => ({ ...current, [field]: value }));
        setSuccess('');
    };

    const handleSave = async () => {
        if (!slug || hasValidationErrors) return;

        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const res = await api.put<ProgramResponse>(`/api/v1/v/${slug}/admin/program`, {
                stamps_required: program.stamps_required,
                reward_title: program.reward_title.trim(),
                reward_description: program.reward_description.trim(),
                terms_text: program.terms_text.trim()
            });

            const currentProgram = toProgramForm(res.data.active_program);
            setProgram(currentProgram);
            setActiveProgram(res.data.active_program);
            setHistory(res.data.history || []);
            initialProgramRef.current = { ...currentProgram };
            setSuccess(res.data.created_version ? `Version ${res.data.active_program?.version ?? ''} is now active.` : 'No program changes detected.');
        } catch (saveError: unknown) {
            setError(getApiErrorMessage(saveError, 'Failed to save program'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10">Loading...</div>;

    return (
        <div className="program-page fade-in">
            <AdminPageHeader
                title="Program"
                description="Manage the reward rules customers see and staff redeem."
                actions={
                    <AdminButton onClick={handleSave} isLoading={saving} disabled={!isDirty || hasValidationErrors || saving}>
                        Publish New Version
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

            {success && (
                <div style={{
                    marginBottom: '20px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    color: '#bbf7d0'
                }}>
                    {success}
                </div>
            )}

            <div className="program-page-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="admin-card" style={{ padding: '24px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                        <div className="program-form-row">
                            <AdminInput
                                label="Reward Title"
                                type="text"
                                value={program.reward_title}
                                onChange={(e) => updateProgram('reward_title', e.target.value)}
                                error={fieldErrors.reward_title}
                                maxLength={80}
                                required
                            />
                            <AdminInput
                                label="Stamps Required"
                                type="number"
                                value={program.stamps_required}
                                onChange={(e) => updateProgram('stamps_required', Number(e.target.value))}
                                error={fieldErrors.stamps_required}
                                min={2}
                                max={30}
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gap: '20px' }}>
                            <label style={{ display: 'grid', gap: '6px' }}>
                                <span style={fieldLabelStyle}>Reward Description</span>
                                <textarea
                                    value={program.reward_description}
                                    onChange={(e) => updateProgram('reward_description', e.target.value)}
                                    maxLength={240}
                                    style={{
                                        ...textareaStyle,
                                        borderColor: fieldErrors.reward_description ? 'var(--danger)' : 'var(--border)'
                                    }}
                                />
                                {fieldErrors.reward_description && <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{fieldErrors.reward_description}</span>}
                            </label>

                            <label style={{ display: 'grid', gap: '6px' }}>
                                <span style={fieldLabelStyle}>Terms</span>
                                <textarea
                                    value={program.terms_text}
                                    onChange={(e) => updateProgram('terms_text', e.target.value)}
                                    maxLength={500}
                                    style={{
                                        ...textareaStyle,
                                        borderColor: fieldErrors.terms_text ? 'var(--danger)' : 'var(--border)'
                                    }}
                                />
                                {fieldErrors.terms_text && <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{fieldErrors.terms_text}</span>}
                            </label>
                        </div>
                    </div>

                    <div className="admin-card" style={{ padding: '20px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '14px', fontSize: '18px' }}>Change History</h3>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {history.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No program versions yet.</p>
                            ) : history.map((entry) => (
                                <div
                                    key={entry.program_id}
                                    className="program-history-row"
                                    style={{
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        background: entry.is_active ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.03)'
                                    }}
                                >
                                    <div>
                                        <strong style={{ color: 'var(--text-primary)' }}>v{entry.version}</strong>
                                        {entry.is_active && (
                                            <div style={{ marginTop: '4px', fontSize: '11px', color: '#93c5fd', fontWeight: 700 }}>ACTIVE</div>
                                        )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {entry.reward_title}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                                            {entry.stamps_required} stamps · {entry.cards_count ?? 0} cards · {formatDateTime(entry.created_at)}
                                        </div>
                                    </div>
                                    <div className="program-history-desc" style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'right' }}>
                                        {entry.reward_description.slice(0, 42)}
                                        {entry.reward_description.length > 42 ? '...' : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <aside className="program-page-aside">
                    <div className="admin-card" style={{ padding: '20px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Version</div>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    v{activeProgram?.version ?? '-'}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cards</div>
                                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {activeProgram?.cards_count ?? 0}
                                </div>
                            </div>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                            New version applies to new cards. Existing active cards keep their current rules.
                        </p>
                    </div>

                    <div className="admin-card" style={{ padding: '20px', background: 'var(--bg-surface, #1e1e1e)', borderRadius: '12px' }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Preview</h3>
                        <CardPreview
                            branding={branding}
                            program={{
                                stamps_required: program.stamps_required,
                                reward_title: program.reward_title || 'Reward Preview'
                            }}
                            stampsCount={Math.min(3, program.stamps_required)}
                        />
                        <div style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{program.reward_description}</strong>
                            <div style={{ marginTop: '8px' }}>{program.terms_text}</div>
                        </div>
                    </div>
                </aside>
            </div>
            <style>{`
                .program-page-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 360px;
                    gap: 28px;
                    align-items: start;
                }
                .program-form-row {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .program-history-row {
                    display: grid;
                    grid-template-columns: 90px minmax(0, 1fr) 96px;
                    gap: 12px;
                    align-items: center;
                }
                .program-page-aside {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    position: sticky;
                    top: 24px;
                }
                @media (max-width: 960px) {
                    .program-page-grid,
                    .program-form-row,
                    .program-history-row {
                        grid-template-columns: 1fr;
                    }
                    .program-page-aside {
                        position: static;
                    }
                    .program-history-desc {
                        text-align: left !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default VendorProgram;
