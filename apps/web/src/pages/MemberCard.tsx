import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MemberCard: React.FC = () => {
    const { logout } = useAuth();
    const [data, setData] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    const fetchCard = async () => {
        try {
            const res = await api.get('/api/v1/me/card');
            setData(res.data);
            setTimeLeft(res.data.expires_in_seconds || 30);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCard();
        const interval = setInterval(fetchCard, 25000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!timeLeft) return;
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    if (!data) return <div style={{ padding: 20 }}>Loading Card...</div>;

    const { card, token, vendor } = data;
    const branding = vendor?.branding || {};
    const cardStyle = branding.card_style || 'SOLID';
    const primaryColor = branding.primary_color || '#000';
    const secondaryColor = branding.secondary_color || '#333';
    const accentColor = branding.accent_color || '#fff';

    // Simple Card Styles
    const getCardBackground = () => {
        if (cardStyle === 'GRADIENT') return `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
        return primaryColor;
    };

    const stampsRequired = card.program?.stamps_required || 10;
    const stamps = card.stamps_count;

    return (
        <div className="card-page container" style={{ maxWidth: '480px', margin: '0 auto', padding: '20px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                    {vendor?.trading_name || 'Loyalty Card'}
                </h2>
                <button
                    onClick={logout}
                    style={{
                        background: 'none',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        color: 'var(--text-secondary, #888)',
                        cursor: 'pointer'
                    }}
                >
                    Logout
                </button>
            </header>

            <div className="loyalty-card" style={{
                background: getCardBackground(),
                color: '#fff',
                padding: '24px',
                borderRadius: '20px',
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '220px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {branding.logo_url && (
                    <img
                        src={branding.logo_url}
                        alt="Logo"
                        style={{ height: '40px', objectFit: 'contain', alignSelf: 'flex-start', marginBottom: 'auto' }}
                    />
                )}

                <div style={{ marginTop: '20px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', opacity: 0.9 }}>
                        {card.program?.reward_title || 'Reward Progess'}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                        {Array.from({ length: stampsRequired }).map((_, i) => (
                            <div key={i} style={{
                                aspectRatio: '1',
                                borderRadius: '50%',
                                background: i < stamps ? accentColor : 'rgba(255,255,255,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                color: primaryColor, // Contrast assuming accent is light on dark card
                                fontSize: '14px',
                                boxShadow: i < stamps ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                            }}>
                                {i < stamps && '✓'}
                            </div>
                        ))}
                    </div>
                    <p style={{ marginTop: '12px', fontSize: '0.9rem', opacity: 0.7, textAlign: 'right' }}>
                        {stamps} / {stampsRequired}
                    </p>
                </div>
            </div>

            <div className="qr-section" style={{
                textAlign: 'center',
                marginTop: '40px',
                background: '#fff',
                padding: '24px',
                borderRadius: '20px',
                color: '#000'
            }}>
                <QRCodeSVG value={token} size={200} />
                <p style={{ marginTop: '16px', color: '#666', fontSize: '0.9rem' }}>
                    Scan to get stamped
                </p>
                <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>
                    Refreshes in {timeLeft}s
                </div>
            </div>
        </div>
    );
};

export default MemberCard;
