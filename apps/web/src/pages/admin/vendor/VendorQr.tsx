import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { api } from '../../../utils/api';
import AdminPageHeader from '../../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../../components/admin/ui/AdminButton';
import AdminInput from '../../../components/admin/ui/AdminInput';
import SignupQrPoster from '../../../components/qr/SignupQrPoster';
import { downloadPosterPng, printSignupPoster } from '../../../components/qr/signupQrPosterUtils';
import type { BranchRecord, QrAssetsResponse } from '../../../types/qr';

const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || error.message || fallback;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

export default function VendorQr() {
    const { slug } = useParams<{ slug: string }>();
    const [assetsData, setAssetsData] = useState<QrAssetsResponse | null>(null);
    const [branches, setBranches] = useState<BranchRecord[]>([]);
    const [selectedAssetIndex, setSelectedAssetIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [showRotateConfirm, setShowRotateConfirm] = useState(false);
    const [branchForm, setBranchForm] = useState({ name: '', address_text: '', city: '', region: '' });
    const [savingBranch, setSavingBranch] = useState(false);
    const posterRef = useRef<HTMLDivElement>(null);

    const loadData = useCallback(async () => {
        if (!slug) return;
        setLoading(true);
        setError('');
        try {
            const [assetsRes, branchesRes] = await Promise.all([
                api.get<QrAssetsResponse>(`/api/v1/v/${slug}/admin/qr/assets`),
                api.get<BranchRecord[]>(`/api/v1/v/${slug}/admin/branches`),
            ]);
            setAssetsData(assetsRes.data);
            setBranches(branchesRes.data);
            setSelectedAssetIndex(0);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to load QR assets'));
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const selectedAsset = assetsData?.assets[selectedAssetIndex] ?? null;

    const copyUrl = async () => {
        if (!selectedAsset) return;
        await navigator.clipboard.writeText(selectedAsset.signup_url);
        setMessage('Signup URL copied.');
    };

    const handleDownloadPng = async () => {
        if (!posterRef.current || !assetsData || !selectedAsset) return;
        setDownloading(true);
        setMessage('');
        try {
            const suffix = selectedAsset.branch_name
                ? selectedAsset.branch_name.replace(/\s+/g, '-').toLowerCase()
                : 'all-locations';
            await downloadPosterPng(
                posterRef.current,
                `${assetsData.vendor_slug}-signup-qr-${suffix}.png`
            );
            setMessage('Poster downloaded.');
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to download poster'));
        } finally {
            setDownloading(false);
        }
    };

    const handleRotate = async () => {
        if (!slug) return;
        setRotating(true);
        setError('');
        setMessage('');
        try {
            await api.post(`/api/v1/v/${slug}/admin/qr/rotate`, { confirm: true });
            setShowRotateConfirm(false);
            setMessage('QR secret rotated. Download and print new posters — old codes no longer work.');
            await loadData();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to rotate QR secret'));
        } finally {
            setRotating(false);
        }
    };

    const handleCreateBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!slug || !branchForm.name.trim()) return;
        setSavingBranch(true);
        setError('');
        try {
            await api.post(`/api/v1/v/${slug}/admin/branches`, branchForm);
            setBranchForm({ name: '', address_text: '', city: '', region: '' });
            setMessage('Branch added.');
            await loadData();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to create branch'));
        } finally {
            setSavingBranch(false);
        }
    };

    const handleDisableBranch = async (branchId: string) => {
        if (!slug) return;
        if (!window.confirm('Disable this branch? Its QR will no longer be offered.')) return;
        setError('');
        try {
            await api.post(`/api/v1/v/${slug}/admin/branches/${branchId}/disable`);
            setMessage('Branch disabled.');
            await loadData();
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, 'Failed to disable branch'));
        }
    };

    if (loading) {
        return <div style={{ padding: 40 }}>Loading QR assets...</div>;
    }

    if (!assetsData) {
        return <div style={{ padding: 40 }}>{error || 'Unable to load QR assets.'}</div>;
    }

    const programIncomplete = !assetsData.active_program;
    const brandingIncomplete = !assetsData.branding?.welcome_text && !assetsData.branding?.logo_url;

    return (
        <div>
            <div className="no-print">
                <AdminPageHeader
                    title="QR Codes"
                    description="Download or print A5 signup posters for tables and counters."
                    actions={
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                            <AdminButton onClick={() => void copyUrl()}>Copy URL</AdminButton>
                        </div>
                    }
                />

                {(programIncomplete || brandingIncomplete) && (
                    <div
                        style={{
                            marginBottom: 16,
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            fontSize: 14,
                        }}
                    >
                        Tip:{' '}
                        {programIncomplete ? (
                            <Link to={`/v/${slug}/admin/program`}>Set up your program</Link>
                        ) : null}
                        {programIncomplete && brandingIncomplete ? ' and ' : null}
                        {brandingIncomplete ? (
                            <Link to={`/v/${slug}/admin/branding`}>add branding</Link>
                        ) : null}{' '}
                        for richer posters.
                    </div>
                )}

                {error ? (
                    <div style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</div>
                ) : null}
                {message ? (
                    <div style={{ color: 'var(--success, #22c55e)', marginBottom: 12 }}>{message}</div>
                ) : null}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {assetsData.assets.map((asset, index) => (
                        <button
                            key={`${asset.scope}-${asset.branch_id ?? 'vendor'}`}
                            type="button"
                            onClick={() => setSelectedAssetIndex(index)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: 999,
                                border: index === selectedAssetIndex ? '2px solid var(--accent)' : '1px solid var(--border)',
                                background: index === selectedAssetIndex ? 'rgba(79, 124, 255, 0.15)' : 'transparent',
                                color: 'inherit',
                                cursor: 'pointer',
                                fontSize: 13,
                            }}
                        >
                            {asset.label}
                        </button>
                    ))}
                </div>

                <section
                    style={{
                        marginBottom: 32,
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                    }}
                >
                    <h3 style={{ marginTop: 0 }}>Branches</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        Each active branch gets its own signup QR for join analytics.
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
                        {branches.map((branch) => (
                            <li
                                key={branch.branch_id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 0',
                                    borderBottom: '1px solid var(--border)',
                                    fontSize: 14,
                                    opacity: branch.is_active ? 1 : 0.6,
                                }}
                            >
                                <span>
                                    {branch.name}
                                    {!branch.is_active ? ' (disabled)' : ''}
                                </span>
                                {branch.is_active && branches.filter((b) => b.is_active).length > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => void handleDisableBranch(branch.branch_id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--danger)',
                                            cursor: 'pointer',
                                            fontSize: 12,
                                        }}
                                    >
                                        Disable
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                    <form onSubmit={(e) => void handleCreateBranch(e)} style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
                        <AdminInput
                            label="New branch name"
                            value={branchForm.name}
                            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                            required
                        />
                        <AdminButton type="submit" isLoading={savingBranch}>
                            Add branch
                        </AdminButton>
                    </form>
                </section>

                <section
                    style={{
                        marginBottom: 32,
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        background: 'rgba(239, 68, 68, 0.06)',
                    }}
                >
                    <h3 style={{ marginTop: 0 }}>Rotate signup QR secret</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        Version {assetsData.secret_version}
                        {assetsData.last_rotated_at
                            ? ` · Last rotated ${new Date(assetsData.last_rotated_at).toLocaleString()}`
                            : ''}
                        {assetsData.requires_signed_url
                            ? ' · Signed URLs required'
                            : ' · Legacy unsigned URLs still accepted until you rotate'}
                    </p>
                    {!showRotateConfirm ? (
                        <AdminButton variant="secondary" onClick={() => setShowRotateConfirm(true)}>
                            Rotate secret
                        </AdminButton>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
                            <p style={{ fontSize: 13, margin: 0 }}>
                                This invalidates all previously printed QR codes. You must reprint posters after
                                rotating.
                            </p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <AdminButton onClick={() => void handleRotate()} isLoading={rotating}>
                                    Confirm rotation
                                </AdminButton>
                                <AdminButton variant="secondary" onClick={() => setShowRotateConfirm(false)}>
                                    Cancel
                                </AdminButton>
                            </div>
                        </div>
                    )}
                </section>
            </div>

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
        </div>
    );
}
