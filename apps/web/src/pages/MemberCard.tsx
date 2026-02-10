import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CardPreview from '../components/CardPreview';

const MemberCard: React.FC = () => {
    const { logout } = useAuth();
    const [data, setData] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(0);


    const [nameInput, setNameInput] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);

    const fetchCard = async () => {
        try {
            const res = await api.get('/api/v1/me/card');
            setData(res.data);
            setTimeLeft(res.data.expires_in_seconds || 30);

            // Check default name
            if (res.data.member?.name === 'Member' || res.data.member?.name === 'New Member' || !res.data.member?.name) {
                setIsEditingName(true);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveName = async () => {
        if (!nameInput.trim()) return;
        try {
            await api.patch('/api/v1/me/profile', { name: nameInput });
            // Optimistic update or refetch
            const startName = nameInput;
            setData((prev: any) => ({ ...prev, member: { ...prev.member, name: startName } }));
            setIsEditingName(false);
        } catch (e) {
            alert('Failed to save name');
        }
    }

    useEffect(() => {
        fetchCard();
        const pollInterval = 3000; // Poll faster (3s) to catch the stamp event quickly
        const interval = setInterval(fetchCard, pollInterval);
        const onVisible = () => {
            if (document.visibilityState === 'visible') fetchCard();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    // Confetti effect when card becomes full
    useEffect(() => {
        if (data?.card?.stamps_count >= data?.card?.stamps_required && data?.card?.status === 'ACTIVE') {
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
    }, [data?.card?.stamps_count, data?.card?.status]);

    useEffect(() => {
        if (!timeLeft) return;
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
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

    if (!data) return <div style={{ padding: 20 }}>Loading Card...</div>;

    const { card, token, vendor } = data;
    const branding = vendor?.branding || {};
    const stamps = card.stamps_count;
    const isFull = stamps >= card.stamps_required;


    // Modern Mesh Gradient Background
    const pageStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: `radial-gradient(at 0% 0%, ${branding.primary_color || '#4f46e5'} 0px, transparent 50%), 
                     radial-gradient(at 100% 0%, ${branding.secondary_color || '#9333ea'} 0px, transparent 50%), 
                     radial-gradient(at 100% 100%, ${branding.accent_color || '#38bdf8'} 0px, transparent 50%), 
                     radial-gradient(at 0% 100%, ${branding.primary_color || '#4f46e5'} 0px, transparent 50%),
                     #0f172a`, // Dark fallback/base
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

    return (
        <div style={pageStyle}>
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
                @keyframes pulse-ring {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
                    70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }
                `}
            </style>

            <header style={{
                width: '100%',
                maxWidth: '380px', // Unify Alignment
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px', // Reduced margin
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {branding.logo_url && (
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
                    )}

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

                <button
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
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(8px)'
                    }}
                >
                    Sign Out
                </button>
            </header>

            {/* Personalization Section */}
            {isEditingName ? (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '32px', width: '100%', maxWidth: '380px', borderRadius: '20px', zIndex: 10 }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 500 }}>What should we call you?</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
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
                            onClick={handleSaveName}
                            style={{
                                padding: '0 20px',
                                borderRadius: '12px',
                                border: 'none',
                                background: branding.accent_color || '#fff',
                                color: '#000', // Contrast check required practically, but assuming light accent or white
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

            <div style={{ width: '100%', maxWidth: '380px', marginBottom: '32px', zIndex: 10 }}>
                {/* 3D Card Container Logic can go here later, for now just the card */}
                <div>
                    <CardPreview
                        branding={branding}
                        program={card.program}
                        stampsCount={stamps}
                    />
                </div>
            </div>

            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '380px', // Unify Alignment
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
                            Congratulations! 🎉
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
            </div>
        </div>
    );
};

export default MemberCard;
