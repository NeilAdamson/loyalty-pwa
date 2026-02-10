import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

type ScanMode = 'stamp' | 'redeem';

function friendlyMessage(code: string | undefined, defaultMsg: string): string {
    const map: Record<string, string> = {
        TOKEN_REPLAYED: "Token already used. Ask customer to refresh their screen.",
        CARD_FULL: "Card is already full! content Switch to 'Redeem Reward' mode and scan this code again.",
        CARD_NOT_ELIGIBLE: "Card not full yet.",
        RATE_LIMITED: "Please wait a moment before stamping again.",
        TOKEN_EXPIRED: "Code expired. Ask customer to refresh their screen.",
        TOKEN_INVALID: "Code invalid. Ask customer to refresh their screen.",
        STAFF_DISABLED: "Your staff account is disabled.",
    };
    return (code && map[code]) || defaultMsg;
}

interface ScannerAreaProps {
    onScan: (token: string) => void;
}

const ScannerArea: React.FC<ScannerAreaProps> = ({ onScan }) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            'staff-qr-reader',
            { fps: 10, qrbox: { width: 280, height: 280 } },
            false
        );
        scanner.render(
            (decodedText) => {
                scanner.clear().catch(console.error);
                onScan(decodedText);
            },
            () => { }
        );
        return () => {
            scanner.clear().catch(console.error);
        };
    }, [onScan]);
    return (
        <div
            id="staff-qr-reader"
            style={{
                width: '100%',
                maxWidth: 'min(400px, 90vw)',
                minHeight: '320px',
            }}
        />
    );
};

const StaffDashboard: React.FC = () => {
    const { logout } = useAuth();
    const outletContext = useOutletContext<{ vendor?: { trading_name?: string; branding?: any } }>();
    const vendor = outletContext?.vendor;
    const branding = vendor?.branding || {};

    const [mode, setMode] = useState<ScanMode>('stamp');
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [resetCounter, setResetCounter] = useState(0);
    const [syncing, setSyncing] = useState(false);

    const resetToScan = useCallback(() => {
        setScanResult(null);
        setStatus('');
        setResetCounter((c) => c + 1);
    }, []);

    const handleScan = useCallback(
        (token: string) => {
            setScanResult(token);
            if (mode === 'stamp') {
                handleStamp(token);
            } else {
                handleRedeem(token);
            }
        },
        [mode]
    );

    const handleStamp = async (token: string) => {
        setStatus('Stamping...');
        try {
            const res = await api.post('/api/v1/tx/stamp', { token });
            const { new_count, stamps_required, is_full } = res.data;

            if (is_full) {
                setStatus(`Stamped! Card FULL (${new_count}/${stamps_required}). Waiting for customer screen to sync...`);
                // Block scanner for 4s
                setSyncing(true);
                setTimeout(() => {
                    setSyncing(false);
                    setStatus(`Card FULL. Scan NEW code to Redeem.`);
                }, 4000);
            } else {
                setStatus(`Stamped! ${new_count} / ${stamps_required}`);
            }

        } catch (err: any) {
            const code = err.response?.data?.code;
            const msg = err.response?.data?.message || err.message;
            setStatus(friendlyMessage(code, 'Error: ' + msg));
            if (code === 'CARD_FULL') {
                // Show info but don't allow immediate redeem with old token
            }
        }
    };

    const handleRedeem = async (tokenArg?: string) => {
        const token = tokenArg ?? scanResult;
        if (!token) return;
        setStatus('Redeeming...');
        try {
            await api.post('/api/v1/tx/redeem', { token });
            setStatus('Redeemed! Success. New card created.');
        } catch (err: any) {
            const code = err.response?.data?.code;
            const msg = err.response?.data?.message || err.message;
            setStatus(friendlyMessage(code, 'Redeem error: ' + msg));
        }
    };

    const primaryColor = branding.primary_color || '#4f46e5';
    const secondaryColor = branding.secondary_color || '#9333ea';
    const accentColor = branding.accent_color || '#38bdf8';

    const pageStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: `radial-gradient(at 0% 0%, ${primaryColor} 0px, transparent 50%),
                     radial-gradient(at 100% 0%, ${secondaryColor} 0px, transparent 50%),
                     radial-gradient(at 100% 100%, ${accentColor} 0px, transparent 50%),
                     radial-gradient(at 0% 100%, ${primaryColor} 0px, transparent 50%),
                     #0f172a`,
        backgroundSize: '150% 150%',
        fontFamily: "'Inter', sans-serif",
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
    };

    // Show scanner if we don't have a result OR if we are showing a success/error message but user wants to scan again
    // In this simplified UI, we hide scanner when we have a result status to show.
    const showScanner = !scanResult && !syncing;

    return (
        <div style={pageStyle}>
            <style>
                {`
                .staff-glass {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
                }
                `}
            </style>

            <header
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                    zIndex: 10,
                }}
            >
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
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
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
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                            }}
                        />
                    ) : (
                        <h2
                            style={{
                                fontSize: '1.4rem',
                                fontWeight: 700,
                                margin: 0,
                                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                                letterSpacing: '-0.02em',
                                lineHeight: 1,
                            }}
                        >
                            {vendor?.trading_name || 'Staff'} — Scan
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
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    Sign Out
                </button>
            </header>

            {showScanner ? (
                <>
                    <div
                        className="staff-glass"
                        style={{
                            width: '100%',
                            maxWidth: '420px',
                            padding: '20px',
                            borderRadius: '20px',
                            marginBottom: '24px',
                            zIndex: 10,
                        }}
                    >
                        <p
                            style={{
                                margin: '0 0 16px 0',
                                fontSize: '1rem',
                                fontWeight: 600,
                                textAlign: 'center',
                            }}
                        >
                            Scan customer's QR code
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'center',
                                marginBottom: '16px',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setMode('stamp')}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: mode === 'stamp' ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                                    background: mode === 'stamp' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                }}
                            >
                                Add stamp
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('redeem')}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: mode === 'redeem' ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                                    background: mode === 'redeem' ? 'rgba(255,255,255,0.2)' : 'transparent',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                }}
                            >
                                Redeem reward
                            </button>
                        </div>
                    </div>
                    <div key={resetCounter} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <ScannerArea onScan={handleScan} />
                    </div>
                </>
            ) : (
                <div
                    className="staff-glass"
                    style={{
                        width: '100%',
                        maxWidth: '420px',
                        padding: '32px',
                        borderRadius: '24px',
                        textAlign: 'center',
                        zIndex: 10,
                    }}
                >
                    <div
                        style={{
                            padding: '16px',
                            marginBottom: '24px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.08)',
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            lineHeight: 1.4,
                        }}
                    >
                        {status}
                    </div>

                    <button
                        type="button"
                        onClick={resetToScan}
                        style={{
                            width: '100%',
                            padding: '14px 24px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '1rem',
                            cursor: 'pointer',
                        }}
                    >
                        Scan next
                    </button>
                </div>
            )}
        </div>
    );
};

export default StaffDashboard;
