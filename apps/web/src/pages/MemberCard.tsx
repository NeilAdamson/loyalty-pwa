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
            const res = await api.get('/me/card');
            setData(res.data);
            setTimeLeft(res.data.expires_in_seconds || 30);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCard();
        // Refresh every 25 seconds (safe margin before 30s expiry)
        const interval = setInterval(fetchCard, 25000);
        return () => clearInterval(interval);
    }, []);

    // Countdown timer for UI effect
    useEffect(() => {
        if (!timeLeft) return;
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    if (!data) return <div>Loading Card...</div>;

    const { card, token } = data;
    // Actually TransactionService.stamp returns it, but GET /me/card returns { card, token, expires_in_seconds }. 
    // We might need program details (stamps_required) from `card.program` if included.
    // Let's assume `card.program` is present or we rely on `card.stamps_count`.

    const stampsRequired = card.program?.stamps_required || 10; // Fallback
    const stamps = card.stamps_count;

    return (
        <div className="card-page container">
            <header>
                <h2>My Loyalty Card</h2>
                <button onClick={logout}>Logout</button>
            </header>

            <div className="card-display" style={{
                border: '2px solid var(--primary-color)',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center',
                margin: '1rem 0'
            }}>
                <h3>{card.program?.reward_title || 'Reward'}</h3>
                <div className="stamps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {Array.from({ length: stampsRequired }).map((_, i) => (
                        <div key={i} style={{
                            height: '40px',
                            width: '40px',
                            background: i < stamps ? 'var(--primary-color)' : '#ccc',
                            borderRadius: '50%',
                            margin: 'auto'
                        }} />
                    ))}
                </div>
                <p>{stamps} / {stampsRequired} Stamps</p>
            </div>

            <div className="qr-section" style={{ textAlign: 'center' }}>
                <p>Scan to Stamp</p>
                <QRCodeSVG value={token} size={256} />
                <p>Refreshes in {timeLeft}s</p>
            </div>
        </div>
    );
};

export default MemberCard;
