import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../utils/api';

type Branch = {
    name?: string;
    address_text?: string | null;
    city?: string | null;
    region?: string | null;
};

type BusinessResponse = {
    trading_name?: string;
    legal_name?: string;
    billing_email?: string | null;
    billing_address?: string | null;
    tax_id?: string | null;
    company_reg_no?: string | null;
    contact_name?: string;
    contact_surname?: string;
    contact_phone?: string;
    average_visit_value?: string | number;
    reward_cost?: string | number;
    branches?: Branch[];
};

type ProgramResponse = {
    active_program: {
        stamps_required: number;
        reward_title: string;
        reward_description: string;
        terms_text: string;
    } | null;
};

type BrandingResponse = {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    background_color?: string | null;
    card_text_color?: string;
    card_style?: string;
    welcome_text?: string | null;
};

type Staff = {
    staff_id: string;
    name: string;
    username: string;
    role: string;
    status: string;
};

const steps = ['Business', 'Program', 'Branding', 'Staff', 'Billing', 'Launch'] as const;

const asMoneyString = (value: string | number | undefined, fallback: string) => {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value);
};

const apiErrorMessage = (err: unknown, fallback: string): string => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { data?: { message?: unknown } } }).response;
        if (typeof response?.data?.message === 'string') return response.data.message;
    }
    return fallback;
};

const fieldStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '42px'
};

const VendorOnboarding: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [stepIndex, setStepIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [staff, setStaff] = useState<Staff[]>([]);

    const [business, setBusiness] = useState({
        trading_name: '',
        legal_name: '',
        contact_name: '',
        contact_surname: '',
        contact_phone: '',
        branch_name: 'Main Branch',
        branch_address_text: '',
        branch_city: '',
        branch_region: '',
        billing_email: '',
        billing_address: '',
        tax_id: '',
        company_reg_no: '',
        average_visit_value: '85.00',
        reward_cost: '25.00'
    });
    const [program, setProgram] = useState({
        stamps_required: 10,
        reward_title: 'Free Reward',
        reward_description: 'Collect 10 stamps to earn a reward.',
        terms_text: 'Standard terms and conditions apply.'
    });
    const [branding, setBranding] = useState({
        primary_color: '#000000',
        secondary_color: '#ffffff',
        accent_color: '#3B82F6',
        background_color: '#121212',
        card_text_color: '#ffffff',
        card_style: 'SOLID',
        welcome_text: ''
    });
    const [newStaff, setNewStaff] = useState({
        name: '',
        username: '',
        pin: '',
        role: 'STAMPER'
    });

    const activeStep = steps[stepIndex];
    const canGoBack = stepIndex > 0;
    const isLastStep = stepIndex === steps.length - 1;

    const staffSummary = useMemo(() => staff.filter((item) => item.status === 'ENABLED'), [staff]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!slug) return;
            setLoading(true);
            setError('');
            try {
                const [businessRes, programRes, brandingRes, staffRes] = await Promise.all([
                    api.get<BusinessResponse>(`/api/v1/v/${slug}/admin/business`),
                    api.get<ProgramResponse>(`/api/v1/v/${slug}/admin/program`),
                    api.get<BrandingResponse>(`/api/v1/v/${slug}/admin/branding`),
                    api.get<Staff[]>(`/api/v1/v/${slug}/admin/staff`)
                ]);
                if (cancelled) return;

                const branch = businessRes.data.branches?.[0] || {};
                setBusiness({
                    trading_name: businessRes.data.trading_name || '',
                    legal_name: businessRes.data.legal_name || '',
                    contact_name: businessRes.data.contact_name || '',
                    contact_surname: businessRes.data.contact_surname || '',
                    contact_phone: businessRes.data.contact_phone || '',
                    branch_name: branch.name || 'Main Branch',
                    branch_address_text: branch.address_text || '',
                    branch_city: branch.city || '',
                    branch_region: branch.region || '',
                    billing_email: businessRes.data.billing_email || '',
                    billing_address: businessRes.data.billing_address || '',
                    tax_id: businessRes.data.tax_id || '',
                    company_reg_no: businessRes.data.company_reg_no || '',
                    average_visit_value: asMoneyString(businessRes.data.average_visit_value, '85.00'),
                    reward_cost: asMoneyString(businessRes.data.reward_cost, '25.00')
                });
                if (programRes.data.active_program) {
                    setProgram(programRes.data.active_program);
                }
                setBranding((current) => ({
                    ...current,
                    ...brandingRes.data,
                    background_color: brandingRes.data.background_color || current.background_color,
                    welcome_text: brandingRes.data.welcome_text || ''
                }));
                setStaff(staffRes.data || []);
            } catch (loadError: unknown) {
                setError(apiErrorMessage(loadError, 'Could not load onboarding data.'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const saveBusiness = async () => {
        await api.put(`/api/v1/v/${slug}/admin/business`, {
            ...business,
            average_visit_value: Number(business.average_visit_value),
            reward_cost: Number(business.reward_cost)
        });
    };

    const saveProgram = async () => {
        await api.put(`/api/v1/v/${slug}/admin/program`, {
            ...program,
            stamps_required: Number(program.stamps_required)
        });
    };

    const saveBranding = async () => {
        await api.put(`/api/v1/v/${slug}/admin/branding`, branding);
    };

    const createStaff = async () => {
        if (!newStaff.name.trim() && !newStaff.pin.trim()) return;
        await api.post(`/api/v1/v/${slug}/admin/staff`, newStaff);
        const staffRes = await api.get<Staff[]>(`/api/v1/v/${slug}/admin/staff`);
        setStaff(staffRes.data || []);
        setNewStaff({ name: '', username: '', pin: '', role: 'STAMPER' });
    };

    const finish = async () => {
        await api.post(`/api/v1/v/${slug}/admin/onboarding/complete`);
        navigate(`/v/${slug}/admin/dashboard`);
    };

    const saveCurrentStep = async () => {
        setSaving(true);
        setError('');
        setMessage('');
        try {
            if (activeStep === 'Business') await saveBusiness();
            if (activeStep === 'Program') await saveProgram();
            if (activeStep === 'Branding') await saveBranding();
            if (activeStep === 'Staff') await createStaff();
            if (activeStep === 'Billing') await saveBusiness();
            if (activeStep === 'Launch') await finish();
            if (!isLastStep) {
                setStepIndex((current) => current + 1);
                setMessage('Saved.');
            }
        } catch (saveError: unknown) {
            setError(apiErrorMessage(saveError, 'Could not save this step.'));
        } finally {
            setSaving(false);
        }
    };

    const input = (label: string, value: string, onChange: (value: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
        <label className="onboarding-field">
            <span>{label}</span>
            <input className="glass-input" style={fieldStyle} value={value} onChange={(event) => onChange(event.target.value)} {...props} />
        </label>
    );

    if (loading) return <div className="p-8 text-center text-muted">Loading onboarding...</div>;

    return (
        <div className="vendor-onboarding fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Vendor Setup</h1>
                    <p className="page-subtitle">Finish the details needed to launch your digital stamp card.</p>
                </div>
            </div>

            <div className="onboarding-steps" aria-label="Onboarding progress">
                {steps.map((step, index) => (
                    <button
                        key={step}
                        type="button"
                        className={`onboarding-step ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
                        onClick={() => setStepIndex(index)}
                    >
                        <span>{index + 1}</span>
                        {step}
                    </button>
                ))}
            </div>

            {error && <div className="onboarding-alert error">{error}</div>}
            {message && <div className="onboarding-alert success">{message}</div>}

            <section className="glass-panel onboarding-panel">
                {activeStep === 'Business' && (
                    <>
                        <h2>Business Details</h2>
                        <div className="onboarding-grid">
                            {input('Trading name', business.trading_name, (value) => setBusiness({ ...business, trading_name: value }), { required: true })}
                            {input('Legal name', business.legal_name, (value) => setBusiness({ ...business, legal_name: value }), { required: true })}
                            {input('Contact first name', business.contact_name, (value) => setBusiness({ ...business, contact_name: value }))}
                            {input('Contact surname', business.contact_surname, (value) => setBusiness({ ...business, contact_surname: value }))}
                            {input('Contact phone', business.contact_phone, (value) => setBusiness({ ...business, contact_phone: value }))}
                        </div>
                        <h3>Main Branch</h3>
                        <div className="onboarding-grid">
                            {input('Branch name', business.branch_name, (value) => setBusiness({ ...business, branch_name: value }))}
                            {input('Address', business.branch_address_text, (value) => setBusiness({ ...business, branch_address_text: value }))}
                            {input('City', business.branch_city, (value) => setBusiness({ ...business, branch_city: value }))}
                            {input('Region', business.branch_region, (value) => setBusiness({ ...business, branch_region: value }))}
                        </div>
                    </>
                )}

                {activeStep === 'Program' && (
                    <>
                        <h2>Stamp Program</h2>
                        <div className="onboarding-grid">
                            <label className="onboarding-field">
                                <span>Stamps required</span>
                                <input className="glass-input" type="number" min={2} max={30} value={program.stamps_required} onChange={(event) => setProgram({ ...program, stamps_required: Number(event.target.value) })} />
                            </label>
                            {input('Reward title', program.reward_title, (value) => setProgram({ ...program, reward_title: value }))}
                        </div>
                        <label className="onboarding-field">
                            <span>Reward description</span>
                            <textarea className="glass-input" value={program.reward_description} onChange={(event) => setProgram({ ...program, reward_description: event.target.value })} rows={3} />
                        </label>
                        <label className="onboarding-field">
                            <span>Terms</span>
                            <textarea className="glass-input" value={program.terms_text} onChange={(event) => setProgram({ ...program, terms_text: event.target.value })} rows={3} />
                        </label>
                    </>
                )}

                {activeStep === 'Branding' && (
                    <>
                        <h2>Branding</h2>
                        <div className="onboarding-grid">
                            {input('Primary color', branding.primary_color, (value) => setBranding({ ...branding, primary_color: value }), { type: 'color' })}
                            {input('Secondary color', branding.secondary_color, (value) => setBranding({ ...branding, secondary_color: value }), { type: 'color' })}
                            {input('Accent color', branding.accent_color, (value) => setBranding({ ...branding, accent_color: value }), { type: 'color' })}
                            {input('Screen background', branding.background_color, (value) => setBranding({ ...branding, background_color: value }), { type: 'color' })}
                            {input('Card text color', branding.card_text_color, (value) => setBranding({ ...branding, card_text_color: value }), { type: 'color' })}
                            {input('Welcome text', branding.welcome_text, (value) => setBranding({ ...branding, welcome_text: value }))}
                        </div>
                    </>
                )}

                {activeStep === 'Staff' && (
                    <>
                        <h2>Staff And Stampers</h2>
                        <p className="onboarding-muted">Staff do not need email addresses. Create a username and PIN for each counter user.</p>
                        <div className="onboarding-grid">
                            {input('Staff name', newStaff.name, (value) => setNewStaff({ ...newStaff, name: value }))}
                            {input('Username', newStaff.username, (value) => setNewStaff({ ...newStaff, username: value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                            {input('PIN', newStaff.pin, (value) => setNewStaff({ ...newStaff, pin: value.replace(/\D/g, '').slice(0, 6) }), { inputMode: 'numeric', placeholder: '4 to 6 digits' })}
                            <label className="onboarding-field">
                                <span>Role</span>
                                <select className="glass-input" value={newStaff.role} onChange={(event) => setNewStaff({ ...newStaff, role: event.target.value })}>
                                    <option value="STAMPER">Stamper</option>
                                    <option value="ADMIN">Admin staff</option>
                                </select>
                            </label>
                        </div>
                        <div className="onboarding-staff-list">
                            {staffSummary.length === 0 ? (
                                <p className="onboarding-muted">No staff created yet.</p>
                            ) : (
                                staffSummary.map((item) => (
                                    <div key={item.staff_id} className="onboarding-staff-row">
                                        <strong>{item.name}</strong>
                                        <code>{item.username}</code>
                                        <span>{item.role}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {activeStep === 'Billing' && (
                    <>
                        <h2>Billing And Estimates</h2>
                        <div className="onboarding-grid">
                            {input('Billing email', business.billing_email, (value) => setBusiness({ ...business, billing_email: value }), { type: 'email' })}
                            {input('Billing address', business.billing_address, (value) => setBusiness({ ...business, billing_address: value }))}
                            {input('Tax/VAT number', business.tax_id, (value) => setBusiness({ ...business, tax_id: value }))}
                            {input('Company registration number', business.company_reg_no, (value) => setBusiness({ ...business, company_reg_no: value }))}
                            {input('Average spend per stamp visit', business.average_visit_value, (value) => setBusiness({ ...business, average_visit_value: value }), { type: 'number', min: '0.01', step: '0.01' })}
                            {input('Cost per reward', business.reward_cost, (value) => setBusiness({ ...business, reward_cost: value }), { type: 'number', min: '0.01', step: '0.01' })}
                        </div>
                    </>
                )}

                {activeStep === 'Launch' && (
                    <>
                        <h2>Launch</h2>
                        <div className="onboarding-review">
                            <p><strong>{business.trading_name}</strong> will launch at <code>/v/{slug}</code>.</p>
                            <p>{program.stamps_required} stamps unlock: <strong>{program.reward_title}</strong></p>
                            <p>{staffSummary.length} enabled staff account{staffSummary.length === 1 ? '' : 's'} created.</p>
                        </div>
                    </>
                )}
            </section>

            <div className="onboarding-actions">
                <button type="button" className="btn-ghost" disabled={!canGoBack || saving} onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>
                    Back
                </button>
                <button type="button" className="btn-premium" disabled={saving} onClick={saveCurrentStep}>
                    {saving ? 'Saving...' : isLastStep ? 'Complete Setup' : activeStep === 'Staff' ? 'Save Staff Step' : 'Save And Continue'}
                </button>
            </div>

            <style>{`
                .vendor-onboarding {
                    max-width: 980px;
                }
                .onboarding-steps {
                    display: grid;
                    grid-template-columns: repeat(6, minmax(0, 1fr));
                    gap: 8px;
                    margin-bottom: 20px;
                }
                .onboarding-step {
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.04);
                    color: var(--text-muted);
                    border-radius: 8px;
                    padding: 10px 8px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .onboarding-step span {
                    width: 20px;
                    height: 20px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.08);
                }
                .onboarding-step.active {
                    color: #fff;
                    border-color: rgba(59,130,246,0.55);
                    background: rgba(59,130,246,0.16);
                }
                .onboarding-step.done {
                    color: #bbf7d0;
                }
                .onboarding-panel {
                    padding: 28px;
                    margin-bottom: 18px;
                }
                .onboarding-panel h2 {
                    margin: 0 0 18px;
                    font-size: 22px;
                    color: #fff;
                }
                .onboarding-panel h3 {
                    margin: 24px 0 14px;
                    font-size: 16px;
                    color: #fff;
                }
                .onboarding-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 16px;
                }
                .onboarding-field {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                    color: var(--text-muted);
                    font-size: 13px;
                    font-weight: 600;
                }
                .onboarding-field textarea {
                    min-height: 92px;
                    resize: vertical;
                }
                .onboarding-muted {
                    color: var(--text-muted);
                    font-size: 14px;
                    margin-bottom: 16px;
                }
                .onboarding-staff-list {
                    margin-top: 20px;
                    display: grid;
                    gap: 8px;
                }
                .onboarding-staff-row {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto auto;
                    gap: 12px;
                    align-items: center;
                    padding: 10px 12px;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                }
                .onboarding-review {
                    color: var(--text-muted);
                    display: grid;
                    gap: 10px;
                }
                .onboarding-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .onboarding-alert {
                    padding: 12px 14px;
                    border-radius: 8px;
                    margin-bottom: 14px;
                    font-size: 14px;
                }
                .onboarding-alert.error {
                    background: rgba(239,68,68,0.12);
                    color: #fecaca;
                    border: 1px solid rgba(239,68,68,0.25);
                }
                .onboarding-alert.success {
                    background: rgba(34,197,94,0.12);
                    color: #bbf7d0;
                    border: 1px solid rgba(34,197,94,0.25);
                }
                @media (max-width: 860px) {
                    .onboarding-steps,
                    .onboarding-grid {
                        grid-template-columns: 1fr;
                    }
                    .onboarding-step {
                        justify-content: flex-start;
                    }
                }
            `}</style>
        </div>
    );
};

export default VendorOnboarding;
