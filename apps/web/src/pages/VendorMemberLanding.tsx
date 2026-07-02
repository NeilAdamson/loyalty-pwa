import React from 'react';
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import AdminButton from '../components/admin/ui/AdminButton';

type VendorPublicData = {
    trading_name?: string;
    branding?: {
        logo_url?: string | null;
        wordmark_url?: string | null;
        welcome_text?: string | null;
        primary_color?: string;
        accent_color?: string;
    };
    active_program?: {
        stamps_required?: number;
        reward_title?: string;
        reward_description?: string;
        terms_text?: string;
    } | null;
};

type VendorLayoutContext = {
    vendor: VendorPublicData | null;
};

const VendorMemberLanding: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { vendor } = useOutletContext<VendorLayoutContext>();

    const branding = vendor?.branding;
    const program = vendor?.active_program;
    const tradingName = vendor?.trading_name || 'Loyalty Program';
    const headline = branding?.welcome_text?.trim() || 'Join our loyalty program';
    const logoUrl = branding?.wordmark_url || branding?.logo_url;
    const stampsRequired = program?.stamps_required ?? 10;
    const rewardTitle = program?.reward_title ?? 'a free reward';
    const rewardDescription = program?.reward_description?.trim();
    const terms = program?.terms_text?.trim();

    const join = () => {
        navigate(`login${location.search}`);
    };

    if (!vendor) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Loading store...
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 16px',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '24px',
                    padding: '28px 24px 32px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                    color: 'var(--text-primary, #fff)',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={tradingName}
                            style={{
                                maxHeight: '56px',
                                maxWidth: '220px',
                                objectFit: 'contain',
                                marginBottom: '12px',
                            }}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : null}
                    <h1 style={{ margin: '0 0 8px 0', fontSize: '1.6rem', fontWeight: 700 }}>
                        {tradingName}
                    </h1>
                    <p style={{ margin: 0, fontSize: '1.05rem', opacity: 0.9 }}>{headline}</p>
                </div>

                <div
                    style={{
                        background: 'rgba(0,0,0,0.18)',
                        borderRadius: '16px',
                        padding: '16px',
                        marginBottom: '20px',
                        lineHeight: 1.5,
                    }}
                >
                    <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>
                        Collect {stampsRequired} stamps → {rewardTitle}
                    </p>
                    {rewardDescription ? (
                        <p style={{ margin: 0, fontSize: '0.92rem', opacity: 0.85 }}>{rewardDescription}</p>
                    ) : null}
                </div>

                <AdminButton type="button" variant="primary" fullWidth onClick={join}>
                    Join or sign in
                </AdminButton>

                <p style={{ margin: '14px 0 0 0', textAlign: 'center', fontSize: '0.85rem', opacity: 0.7 }}>
                    No app needed — verify with SMS in seconds
                </p>

                {terms ? (
                    <p style={{ margin: '16px 0 0 0', fontSize: '0.75rem', opacity: 0.55, lineHeight: 1.45 }}>
                        {terms}
                    </p>
                ) : null}
            </div>
        </div>
    );
};

export default VendorMemberLanding;
