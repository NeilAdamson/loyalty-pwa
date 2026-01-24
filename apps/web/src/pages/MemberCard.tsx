import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CardPreview from '../components/CardPreview';

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

            <div className="loyalty-card-container" style={{ display: 'flex', justifyContent: 'center' }}>
                <CardPreview
                    branding={branding}
                    program={card.program}
                    stampsCount={stamps}
                />
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
