import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';

export default function AdminVendorQr() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [vendor, setVendor] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchVendor();
    }, [id]);

    const fetchVendor = async () => {
        try {
            const res = await api.get(`/api/v1/admin/vendors/${id}`);
            setVendor(res.data.vendor || res.data);
        } catch (error) {
            console.error("Failed to fetch vendor", error);
            alert('Failed to load vendor details');
            navigate('/admin/vendors');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: 40 }}>Loading QR Assets...</div>;
    if (!vendor) return <div style={{ padding: 40 }}>Vendor not found</div>;

    // Use current host for links
    // In production, this should be configurable or pulled from environment
    const baseUrl = window.location.origin;
    const memberUrl = `${baseUrl}/v/${vendor.vendor_slug}`;
    const staffUrl = `${baseUrl}/v/${vendor.vendor_slug}/staff`;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            <div className="no-print">
                <AdminPageHeader
                    title={`QR Assets: ${vendor.trading_name}`}
                    description="Download or print these codes for physical display."
                    actions={
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <AdminButton variant="secondary" onClick={handlePrint}>
                                🖨️ Print
                            </AdminButton>
                            <AdminButton onClick={() => navigate('/admin/vendors')}>
                                Back
                            </AdminButton>
                        </div>
                    }
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
                {/* Member QR */}
                <QrCard
                    title="Member Join Code"
                    description="Customers scan this to join or view their card."
                    url={memberUrl}
                    color="black"
                />

                {/* Staff QR */}
                <QrCard
                    title="Staff Login"
                    description="Staff scan this to access the POS terminal."
                    url={staffUrl}
                    color="#4f7cff"
                    isPrivate
                />
            </div>

            {/* Print Only Styles */}
            <style>{`
                @media print {
                    .no-print, .adminSidebar { display: none !important; }
                    .adminContent { margin: 0; padding: 0; }
                    .adminShell { display: block; }
                    body { background: white; color: black; }
                }
            `}</style>
        </div>
    );
}

const QrCard = ({ title, description, url, color, isPrivate = false }: any) => (
    <div style={{
        background: 'white',
        color: 'black',
        padding: '30px',
        borderRadius: '20px',
        textAlign: 'center',
        border: '1px solid #ddd',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
        <h3 style={{ marginBottom: '10px', fontSize: '20px' }}>{title}</h3>
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>{description}</p>

        <div style={{
            background: 'white',
            padding: '20px',
            display: 'inline-block',
            border: `4px solid ${color}`,
            borderRadius: '10px',
            marginBottom: '20px'
        }}>
            <QRCodeSVG value={url} size={200} fgColor={color} />
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
                textDecoration: 'none'
            }}
        >
            {url}
        </a>

        {isPrivate && (
            <div style={{
                marginTop: '10px',
                color: 'red',
                fontWeight: 'bold',
                fontSize: '12px',
                textTransform: 'uppercase'
            }}>
                Keep Private
            </div>
        )}
    </div>
);
