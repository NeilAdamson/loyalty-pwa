import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type StaffPresentationOverlayProps = {
    token: string;
    isFull: boolean;
    timeLeft: number;
    accentColor?: string;
    onClose: () => void;
};

const StaffPresentationOverlay: React.FC<StaffPresentationOverlayProps> = ({
    token,
    isFull,
    timeLeft,
    accentColor,
    onClose,
}) => {
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Show code to staff"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: '#ffffff',
                color: '#111827',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
            }}
        >
            <p
                style={{
                    margin: '0 0 8px 0',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    textAlign: 'center',
                }}
            >
                {isFull ? 'Show this to redeem your reward' : 'Show this to earn a stamp'}
            </p>
            <p style={{ margin: '0 0 24px 0', fontSize: '0.95rem', opacity: 0.7, textAlign: 'center' }}>
                Staff will scan this code at the counter
            </p>

            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: '#f9fafb',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                }}
            >
                <QRCodeSVG value={token} size={260} level="M" />
            </div>

            <div
                style={{
                    marginTop: '24px',
                    width: 'min(280px, 80vw)',
                    height: '4px',
                    background: '#e5e7eb',
                    borderRadius: '2px',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${Math.max(0, (timeLeft / 30) * 100)}%`,
                        background: accentColor || '#4f46e5',
                        transition: 'width 1s linear',
                    }}
                />
            </div>
            <p style={{ margin: '12px 0 0 0', fontSize: '0.85rem', opacity: 0.65 }}>
                Refreshes in {Math.max(0, timeLeft)}s
            </p>

            <button
                type="button"
                onClick={onClose}
                style={{
                    marginTop: '32px',
                    padding: '12px 24px',
                    borderRadius: '999px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                }}
            >
                Done
            </button>
        </div>
    );
};

export default StaffPresentationOverlay;
