import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import AdminTable from '../../components/admin/ui/AdminTable';
import AdminBadge from '../../components/admin/ui/AdminBadge';

interface Vendor {
    vendor_id: string;
    vendor_slug: string;
    legal_name: string;
    trading_name: string;
    status: string;
    _count: {
        members: number;
        branches: number;
    }
}

export default function AdminVendorList() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await api.get('/api/v1/admin/vendors');
            setVendors(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch vendors", error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { header: 'Trading Name', accessor: 'trading_name' as keyof Vendor },
        { header: 'Slug', accessor: 'vendor_slug' as keyof Vendor },
        {
            header: 'Status',
            render: (v: Vendor) => <AdminBadge status={v.status} />
        },
        {
            header: 'Members',
            render: (v: Vendor) => v._count?.members || 0
        },
        {
            header: 'Branches',
            render: (v: Vendor) => v._count?.branches || 0
        },
        {
            header: 'Actions',
            render: (v: Vendor) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <AdminButton
                        variant="secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/vendors/${v.vendor_id}`); }}
                    >
                        Manage
                    </AdminButton>
                    <AdminButton
                        variant="secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/vendors/${v.vendor_id}/qr`); }}
                    >
                        QR
                    </AdminButton>
                </div>
            )
        }
    ];

    return (
        <div>
            <AdminPageHeader
                title="Vendors"
                description="Manage all vendors, subscription status, and onboard new businesses."
                actions={
                    <AdminButton onClick={() => navigate('/admin/vendors/new')}>
                        + New Vendor
                    </AdminButton>
                }
            />

            <AdminTable
                columns={columns}
                data={vendors}
                isLoading={loading}
                emptyMessage="No vendors found. Ready to onboard your first customer?"
            />
        </div>
    );
}
