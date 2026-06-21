import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';

export type MemberTransaction = {
    id: string;
    type: 'STAMP' | 'REDEEM';
    at: string;
};

type MemberActivityListProps = {
    refreshKey?: number;
};

const formatWhen = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const MemberActivityList: React.FC<MemberActivityListProps> = ({ refreshKey = 0 }) => {
    const [items, setItems] = useState<MemberTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');

        void api
            .get<{ transactions?: MemberTransaction[] }>('/api/v1/me/transactions', {
                params: { limit: 20 },
            })
            .then((res) => {
                if (cancelled) return;
                setItems(res.data.transactions ?? []);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Unable to load activity');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    return (
        <div
            className="glass-panel"
            style={{
                width: '100%',
                maxWidth: '380px',
                padding: '16px 20px',
                borderRadius: '20px',
                marginBottom: '16px',
                zIndex: 10,
            }}
        >
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                }}
            >
                <span>Recent activity</span>
                <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>{open ? '−' : '+'}</span>
            </button>

            {open ? (
                <div style={{ marginTop: '12px' }}>
                    {loading ? (
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem' }}>Loading...</p>
                    ) : error ? (
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem' }}>{error}</p>
                    ) : items.length === 0 ? (
                        <p style={{ margin: 0, opacity: 0.7, fontSize: '0.85rem' }}>
                            No stamps or redemptions yet on this card.
                        </p>
                    ) : (
                        <ul
                            style={{
                                listStyle: 'none',
                                margin: 0,
                                padding: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                            }}
                        >
                            {items.map((item) => (
                                <li
                                    key={`${item.type}-${item.id}`}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.85rem',
                                        padding: '8px 0',
                                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    }}
                                >
                                    <span style={{ fontWeight: 500 }}>
                                        {item.type === 'STAMP' ? 'Stamp earned' : 'Reward redeemed'}
                                    </span>
                                    <span style={{ opacity: 0.65, fontSize: '0.78rem' }}>
                                        {formatWhen(item.at)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
};

export default MemberActivityList;
