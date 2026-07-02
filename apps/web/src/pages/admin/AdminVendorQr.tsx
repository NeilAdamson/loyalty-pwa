import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import SignupQrPoster from '../../components/qr/SignupQrPoster';
import { downloadPosterPng, printSignupPoster } from '../../components/qr/signupQrPosterUtils';
import type { QrAssetsResponse } from '../../types/qr';

const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || error.message || fallback;
    }
    return fallback;
};

export default function AdminVendorQr() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [assetsData, setAssetsData] = useState<QrAssetsResponse | null>(null);
    const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const posterRef = useRef<HTMLDivElement>(null);

    const fetchAssets = useCallback(async () => {
        try {
            const res = await api.get<QrAssetsResponse>(`/api/v1/admin/vendors/${id}/qr/assets`);
            setAssetsData(res.data);
        } catch (error) {
            console.error('Failed to fetch vendor QR assets', error);
            alert('Failed to load vendor QR assets');
            navigate('/admin/vendors');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        if (id) void fetchAssets();
    }, [id, fetchAssets]);

    if (loading) return <div style={{ padding: 40 }}>Loading QR Assets...</div>;
    if (!assetsData) return <div style={{ padding: 40 }}>Vendor not found</div>;

    const selectedAsset = assetsData.assets[selectedAssetIndex] ?? assetsData.assets[0];
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const staffUrl = `${baseUrl}/v/${assetsData.vendor_slug}/staff`;

    const handleDownloadPng = async () => {
        if (!posterRef.current || !selectedAsset) return;
        setDownloading(true);
        try {
            const suffix = selectedAsset.branch_name
                ? selectedAsset.branch_name.replace(/\s+/g, '-').toLowerCase()
                : 'all-locations';
            await downloadPosterPng(
                posterRef.current,
                `${assetsData.vendor_slug}-signup-qr-${suffix}.png`
            );
        } catch (err: unknown) {
            alert(getApiErrorMessage(err, 'Failed to download poster'));
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div>
            <div className="no-print">
                <AdminPageHeader
                    title={`QR Assets: ${assetsData.trading_name}`}
                    description="Download or print A5 signup posters and staff login codes."
                    actions={
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <AdminButton variant="secondary" onClick={() => printSignupPoster()}>
                                Print A5
                            </AdminButton>
                            <AdminButton
                                variant="secondary"
                                onClick={() => void handleDownloadPng()}
                                isLoading={downloading}
                            >
                                Download PNG
                            </AdminButton>
                            <AdminButton onClick={() => navigate('/admin/vendors')}>Back</AdminButton>
                        </div>
                    }
                />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {assetsData.assets.map((asset, index) => (
                        <button
                            key={`${asset.scope}-${asset.branch_id ?? 'vendor'}`}
                            type="button"
                            onClick={() => setSelectedAssetIndex(index)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: 999,
                                border: index === selectedAssetIndex ? '2px solid #4f7cff' : '1px solid #ddd',
                                background: index === selectedAssetIndex ? 'rgba(79, 124, 255, 0.15)' : 'white',
                                cursor: 'pointer',
                                fontSize: 13,
                            }}
                        >
                            {asset.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 40 }}>
                <div className="signup-qr-print-root signup-qr-poster-preview-wrap">
                    {selectedAsset ? (
                        <SignupQrPoster
                            ref={posterRef}
                            tradingName={assetsData.trading_name}
                            signupUrl={selectedAsset.signup_url}
                            branchName={selectedAsset.branch_name}
                            branding={assetsData.branding}
                            program={assetsData.active_program}
                        />
                    ) : null}
                </div>

                <StaffQrCard url={staffUrl} />
            </div>
        </div>
    );
}

const StaffQrCard = ({ url }: { url: string }) => (
    <div
        className="no-print"
        style={{
            background: 'white',
            color: 'black',
            padding: '30px',
            borderRadius: '20px',
            textAlign: 'center',
            border: '1px solid #ddd',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            alignSelf: 'start',
        }}
    >
        <h3 style={{ marginBottom: '10px', fontSize: '20px' }}>Staff Login</h3>
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            Staff scan this to access the POS terminal.
        </p>
        <div
            style={{
                background: 'white',
                padding: '20px',
                display: 'inline-block',
                border: '4px solid #4f7cff',
                borderRadius: '10px',
                marginBottom: '20px',
            }}
        >
            <QRCodeSVG value={url} size={200} fgColor="#4f7cff" />
        </div>
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'block',
                background: '#f4f4f4',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '12px',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                color: 'inherit',
                textDecoration: 'none',
            }}
        >
            {url}
        </a>
        <div
            style={{
                marginTop: '10px',
                color: 'red',
                fontWeight: 'bold',
                fontSize: '12px',
                textTransform: 'uppercase',
            }}
        >
            Keep Private
        </div>
    </div>
);
