import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CardPreview from '../components/CardPreview';
import PasskeyEnrollPrompt from '../components/PasskeyEnrollPrompt';
import MemberRewardDetails from '../components/member/MemberRewardDetails';
import MemberActivityList from '../components/member/MemberActivityList';
import StaffPresentationOverlay from '../components/member/StaffPresentationOverlay';
import { loadMemberCardSnapshot, saveMemberCardSnapshot } from '../utils/memberCardCache';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const PASSKEY_PROMPT_KEY = 'punchcard_prompt_passkey';

type MemberCardApiResponse = {
    card?: {
        stamps_count?: number
        status?: string
        program?: {
            stamps_required?: number
            reward_title?: string
            reward_description?: string
            terms_text?: string
            [key: string]: unknown
        }
        [key: string]: unknown
    }
    member?: { name?: string; [key: string]: unknown }
    vendor?: {
        trading_name?: string
        vendor_slug?: string
        status?: string
        branding?: {
            primary_color?: string
            secondary_color?: string
            accent_color?: string
            background_color?: string
            logo_url?: string
            wordmark_url?: string
            [key: string]: unknown
        }
        [key: string]: unknown
    }
    token?: string | null
    expires_in_seconds?: number
    read_only?: boolean
    [key: string]: unknown
};

const MemberCard: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const online = useOnlineStatus();
    const [data, setData] = useState<MemberCardApiResponse | null>(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const cached = loadMemberCardSnapshot();
            if (cached?.data) return cached.data as MemberCardApiResponse;
        }
        return null;
    });
    const [timeLeft, setTimeLeft] = useState(0);
    const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
    const [showStaffPresentation, setShowStaffPresentation] = useState(false);
    const [usingCache, setUsingCache] = useState(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return Boolean(loadMemberCardSnapshot()?.data);
        }
        return false;
    });
    const [activityRefreshKey, setActivityRefreshKey] = useState(0);

    const [nameInput, setNameInput] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);

    const fetchCard = async () => {
        try {
            const res = await api.get<MemberCardApiResponse>('/api/v1/me/card');
            setData(res.data);
            setUsingCache(false);
            saveMemberCardSnapshot(res.data as Record<string, unknown>);
            setTimeLeft(res.data.expires_in_seconds || 30);
            setActivityRefreshKey((key) => key + 1);

            const slug = res.data?.vendor?.vendor_slug as string | undefined;
            if (slug && sessionStorage.getItem(PASSKEY_PROMPT_KEY) === '1') {
                setShowPasskeyPrompt(true);
            }

            if (res.data.member?.name === 'Member' || res.data.member?.name === 'New Member' || !res.data.member?.name) {
                setIsEditingName(true);
            }
        } catch (err) {
            console.error(err);
            if (!online) {
                const cached = loadMemberCardSnapshot();
                if (cached?.data) {
                    setData(cached.data as MemberCardApiResponse);
                    setUsingCache(true);
                    setTimeLeft(0);
                }
            }
        }
    };

    const handleSaveName = async () => {
        if (!nameInput.trim()) return;
        try {
            await api.patch('/api/v1/me/profile', { name: nameInput });
            const startName = nameInput;
            setData((prev) =>
                prev
                    ? {
                          ...prev,
                          member: { ...(prev.member ?? {}), name: startName },
                      }
                    : prev
            );
            setIsEditingName(false);
        } catch {
            alert('Failed to save name');
        }
    };

    useEffect(() => {
        void fetchCard();
        const pollInterval = 3000;
        const interval = setInterval(() => {
            if (navigator.onLine) void fetchCard();
        }, pollInterval);
        const onVisible = () => {
            if (document.visibilityState === 'visible' && navigator.onLine) void fetchCard();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- initial mount only
    }, []);

    useEffect(() => {
        if (online) void fetchCard();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when connectivity returns
    }, [online]);

    useEffect(() => {
        const required = data?.card?.program?.stamps_required || 10;
        const stampCount = data?.card?.stamps_count ?? 0;
        if (stampCount >= required && data?.card?.status === 'ACTIVE') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: [
                    data.vendor?.branding?.primary_color || '#4f46e5',
                    data.vendor?.branding?.secondary_color || '#9333ea',
                    data.vendor?.branding?.accent_color || '#38bdf8',
                    '#ffffff'
                ]
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- confetti only on card fullness
    }, [data?.card?.stamps_count, data?.card?.status, data?.card?.program?.stamps_required]);

    useEffect(() => {
        if (!timeLeft) return;
        const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    useEffect(() => {
        if (data?.vendor?.branding?.background_color) {
            const prev = document.body.style.background;
            document.body.style.background = data.vendor.branding.background_color;
            document.body.style.minHeight = '100vh';
            return () => { document.body.style.background = prev; };
        }
    }, [data]);

    if (!data?.card) {
        return <div style={{ padding: 20 }}>Loading Card...</div>;
    }

    const { card, token, vendor } = data;
    const branding = vendor?.branding || {};
    const stamps = card.stamps_count ?? 0;
    const required = card.program?.stamps_required || 10;
    const isFull = stamps >= required;
    const readOnly = data.read_only === true || usingCache || !online;
    const hasLiveToken = Boolean(token) && !readOnly;

    const previewProgram =
        card.program != null
            ? {
                  stamps_required: card.program.stamps_required ?? 10,
                  reward_title: card.program.reward_title ?? 'Reward',
              }
            : undefined;

    const pageStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: `radial-gradient(at 0% 0%, ${branding.primary_color || '#4f46e5'} 0px, transparent 50%), 
                     radial-gradient(at 100% 0%, ${branding.secondary_color || '#9333ea'} 0px, transparent 50%), 
                     radial-gradient(at 100% 100%, ${branding.accent_color || '#38bdf8'} 0px, transparent 50%), 
                     radial-gradient(at 0% 100%, ${branding.primary_color || '#4f46e5'} 0px, transparent 50%),
                     #0f172a`,
        backgroundSize: '150% 150%',
        animation: 'mesh 15s ease infinite',
        fontFamily: "'Inter', sans-serif",
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
    };

    const dismissPasskeyPrompt = () => {
        sessionStorage.removeItem(PASSKEY_PROMPT_KEY);
        setShowPasskeyPrompt(false);
    };

    return (
        <div style={pageStyle}>
            {showPasskeyPrompt && data?.vendor?.vendor_slug ? (
                <PasskeyEnrollPrompt
                    vendorSlug={data.vendor.vendor_slug as string}
                    onDone={dismissPasskeyPrompt}
                />
            ) : null}

            {showStaffPresentation && hasLiveToken && token ? (
                <StaffPresentationOverlay
                    token={token}
                    isFull={isFull}
                    timeLeft={timeLeft}
                    accentColor={branding.accent_color as string | undefined}
                    onClose={() => setShowStaffPresentation(false)}
                />
            ) : null}

            <style>
                {`
                @keyframes mesh { 
                    0% { background-position: 0% 50%; } 
                    50% { background-position: 100% 50%; } 
                    100% { background-position: 0% 50%; } 
                }
                .glass-panel {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
                }
                `}
            </style>

            {(usingCache || !online) ? (
                <div
                    style={{
                        width: '100%',
                        maxWidth: '380px',
                        marginBottom: '16px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.35)',
                        fontSize: '0.85rem',
                        zIndex: 10,
                    }}
                >
                    {online
                        ? 'Showing saved card — reconnect to refresh your scan code.'
                        : 'You are offline. Showing your last saved card; connect to refresh your scan code.'}
                </div>
            ) : null}

            {data.read_only ? (
                <div
                    style={{
                        width: '100%',
                        maxWidth: '380px',
                        marginBottom: '16px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontSize: '0.85rem',
                        zIndex: 10,
                    }}
                >
                    This store is temporarily unavailable. Your card is shown read-only.
                </div>
            ) : null}

            <header style={{
                width: '100%',
                maxWidth: '380px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {branding.logo_url ? (
                        <img
                            src={branding.logo_url}
                            alt="Brand"
                            style={{
                                height: '42px',
                                width: '42px',
                                objectFit: 'contain',
                                borderRadius: '10px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                        />
                    ) : null}

                    {branding.wordmark_url ? (
                        <img
                            src={branding.wordmark_url}
                            alt={vendor?.trading_name}
                            style={{
                                height: '32px',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                            }}
                        />
                    ) : (
                        <h2 style={{
                            fontSize: '1.4rem',
                            fontWeight: 700,
                            margin: 0,
                            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                            letterSpacing: '-0.02em',
                            lineHeight: 1
                        }}>
                            {vendor?.trading_name || 'Membership'}
                        </h2>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/me/settings')}
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            padding: '10px 14px',
                            borderRadius: '30px',
                            color: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        Account
                    </button>
                    <button
                        type="button"
                        onClick={logout}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            padding: '10px 18px',
                            borderRadius: '30px',
                            color: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            {isEditingName ? (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '32px', width: '100%', maxWidth: '380px', borderRadius: '20px', zIndex: 10 }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 500 }}>What should we call you?</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="Type your name..."
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'rgba(255,255,255,0.9)',
                                color: '#000',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={handleSaveName}
                            style={{
                                padding: '0 20px',
                                borderRadius: '12px',
                                border: 'none',
                                background: branding.accent_color || '#fff',
                                color: '#000',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                            }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ marginBottom: '32px', textAlign: 'center', zIndex: 10, width: '100%', maxWidth: '380px' }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: 400,
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        Welcome back, <span style={{ fontWeight: 700 }}>{data.member?.name}</span>
                    </h3>
                </div>
            )}

            <div style={{ width: '100%', maxWidth: '380px', marginBottom: '16px', zIndex: 10 }}>
                <CardPreview
                    branding={branding}
                    program={previewProgram}
                    stampsCount={stamps}
                />
            </div>

            <MemberRewardDetails
                rewardDescription={card.program?.reward_description}
                termsText={card.program?.terms_text}
            />

            <MemberActivityList refreshKey={activityRefreshKey} />

            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '380px',
                padding: '32px',
                borderRadius: '32px',
                textAlign: 'center',
                color: '#fff',
                zIndex: 10,
                ...(isFull ? {
                    border: `2px solid ${branding.accent_color || '#fff'}`,
                    boxShadow: `0 0 20px ${branding.accent_color || 'rgba(255,255,255,0.4)'}`
                } : {})
            }}>
                {hasLiveToken && token ? (
                    <>
                        <div style={{
                            background: '#fff',
                            padding: '16px',
                            borderRadius: '20px',
                            display: 'inline-block',
                            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)',
                            marginBottom: '20px'
                        }}>
                            <QRCodeSVG value={token} size={180} />
                        </div>

                        {isFull ? (
                            <>
                                <h3 style={{
                                    marginTop: '0',
                                    marginBottom: '8px',
                                    fontSize: '1.4rem',
                                    fontWeight: 700,
                                    color: branding.accent_color || '#fff',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                }}>
                                    Congratulations!
                                </h3>
                                <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem', fontWeight: 500 }}>
                                    Ask your server to scan to redeem your reward!
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 style={{ marginTop: '0', marginBottom: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
                                    Scan to Earn
                                </h3>
                                <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>
                                    Code refreshes automatically
                                </p>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowStaffPresentation(true)}
                            style={{
                                marginTop: '20px',
                                width: '100%',
                                padding: '14px 20px',
                                borderRadius: '999px',
                                border: 'none',
                                background: branding.accent_color || '#fff',
                                color: '#111827',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                            }}
                        >
                            Show to staff
                        </button>

                        <div style={{
                            marginTop: '24px',
                            height: '4px',
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                background: branding.accent_color || '#fff',
                                width: `${(timeLeft / 30) * 100}%`,
                                transition: 'width 1s linear'
                            }} />
                        </div>
                    </>
                ) : (
                    <p style={{ margin: 0, opacity: 0.85, fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {readOnly
                            ? 'Connect to the internet to refresh your scan code for stamping or redemption.'
                            : 'Unable to load scan code. Please try again shortly.'}
                    </p>
                )}
            </div>
        </div>
    );
};

export default MemberCard;
