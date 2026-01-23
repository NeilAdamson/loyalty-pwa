import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StaffDashboard: React.FC = () => {
    const { logout } = useAuth();
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [cardData, setCardData] = useState<any>(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);

        function onScanSuccess(decodedText: string) {
            scanner.clear();
            setScanResult(decodedText);
            handleStamp(decodedText);
        }

        function onScanFailure(_error: any) {
            // handle scan failure, usually better to ignore and keep scanning.
        }

        return () => {
            scanner.clear().catch(console.error);
        };
    }, []);

    const handleStamp = async (token: string) => {
        setStatus('Stamping...');
        try {
            const res = await api.post('/tx/stamp', { token });
            const { new_count, stamps_required, is_full } = res.data;
            setStatus(`Success! Stamps: ${new_count}/${stamps_required}`);
            setCardData(res.data);

            if (is_full) {
                // Auto-redeem offer? Or show button? Implementation Plan said "Show Redeem Button".
            }
        } catch (err: any) {
            setStatus('Error: ' + (err.response?.data?.message || err.message));
            // Handle CARD_FULL explicitly if we want to switch to redeem mode immediately?
            if (err.response?.data?.code === 'CARD_FULL') {
                setStatus('Card is Full! Ready to Redeem.');
                setCardData({ is_full: true, token }); // Hack to pass token for redeem
            }
        }
    };

    const handleRedeem = async () => {
        if (!scanResult && !cardData?.token) return;
        setStatus('Redeeming...');
        try {
            await api.post('/tx/redeem', { token: scanResult || cardData.token });
            setStatus('Redeemed Successfully! New Card Created.');
            setCardData(null);
            setScanResult(null);
            // Optionally restart scanner
            window.location.reload();
        } catch (err: any) {
            setStatus('Redeem Error: ' + (err.response?.data?.message || err.message));
        }
    };

    const reset = () => {
        window.location.reload();
    };

    return (
        <div className="container">
            <header>
                <h2>Staff Dashboard</h2>
                <button onClick={logout}>Logout</button>
            </header>

            {!scanResult ? (
                <div id="reader" style={{ width: '500px' }}></div>
            ) : (
                <div className="result-area">
                    <h3>Result</h3>
                    <div className="status-box" style={{ padding: '1rem', background: '#f0f0f0' }}>
                        {status}
                    </div>

                    {cardData?.is_full && (
                        <button
                            onClick={handleRedeem}
                            style={{
                                background: 'green',
                                color: 'white',
                                padding: '1rem',
                                fontSize: '1.2rem',
                                display: 'block',
                                width: '100%',
                                marginTop: '1rem'
                            }}
                        >
                            redeem Reward
                        </button>
                    )}

                    <button onClick={reset} style={{ marginTop: '1rem' }}>Scan Next</button>
                </div>
            )}
        </div>
    );
};

export default StaffDashboard;
