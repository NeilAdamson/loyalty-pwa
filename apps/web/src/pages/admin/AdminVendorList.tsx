import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { Link } from 'react-router-dom';

interface Vendor {
    vendor_id: string;
    trading_name: string;
    vendor_slug: string;
    status: string;
    created_at: string;
    _count?: {
        members: number;
        branches: number;
    }
}

const AdminVendorList: React.FC = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await api.get('/api/v1/admin/vendors');
            setVendors(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2>Vendors</h2>
                <Link to="/admin/vendors/new" style={{ padding: '10px', background: 'green', color: 'white', textDecoration: 'none' }}>
                    + New Vendor
                </Link>
            </div>

            {loading ? <div>Loading...</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>Name</th>
                            <th style={{ padding: '10px' }}>Slug</th>
                            <th style={{ padding: '10px' }}>Status</th>
                            <th style={{ padding: '10px' }}>Members</th>
                            <th style={{ padding: '10px' }}>Branches</th>
                            <th style={{ padding: '10px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vendors.map(v => (
                            <tr key={v.vendor_id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px' }}>{v.trading_name}</td>
                                <td style={{ padding: '10px' }}>{v.vendor_slug}</td>
                                <td style={{ padding: '10px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        background: v.status === 'ACTIVE' ? '#e6fffa' : '#fff5f5',
                                        color: v.status === 'ACTIVE' ? '#2c7a7b' : '#c53030'
                                    }}>
                                        {v.status}
                                    </span>
                                </td>
                                <td style={{ padding: '10px' }}>{v._count?.members || 0}</td>
                                <td style={{ padding: '10px' }}>{v._count?.branches || 0}</td>
                                <td style={{ padding: '10px' }}>
                                    <button onClick={() => alert('View Details TODO')} style={{ marginRight: '5px' }}>View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default AdminVendorList;
