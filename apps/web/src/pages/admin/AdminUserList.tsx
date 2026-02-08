import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import AdminTable from '../../components/admin/ui/AdminTable';
import AdminBadge from '../../components/admin/ui/AdminBadge';
import { useAdminAuth } from '../../context/AdminAuthContext';

interface AdminUser {
    admin_id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    created_at: string;
    last_login_at: string | null;
}

export default function AdminUserList() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { admin: currentUser } = useAdminAuth();

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const res = await api.get('/api/v1/admin/users');
            setAdmins(res.data.admins);
        } catch (error) {
            console.error("Failed to fetch admins", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (admin: AdminUser) => {
        if (!window.confirm(`Are you sure you want to ${admin.status === 'ACTIVE' ? 'disable' : 'enable'} ${admin.name}?`)) return;

        try {
            const newStatus = admin.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
            await api.patch(`/api/v1/admin/users/${admin.admin_id}`, { status: newStatus });
            fetchAdmins();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to update status');
        }
    };

    const columns = [
        { header: 'Name', accessor: 'name' as keyof AdminUser },
        { header: 'Email', accessor: 'email' as keyof AdminUser },
        {
            header: 'Role',
            render: (u: AdminUser) => (
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{u.role}</span>
            )
        },
        {
            header: 'Status',
            render: (u: AdminUser) => <AdminBadge status={u.status} />
        },
        {
            header: 'Last Login',
            render: (u: AdminUser) => u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '-'
        },
        {
            header: 'Actions',
            render: (u: AdminUser) => (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <AdminButton
                        variant="secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${u.admin_id}/edit`); }}
                    >
                        Edit
                    </AdminButton>
                    {u.admin_id !== currentUser?.admin_id && (
                        <AdminButton
                            variant={u.status === 'ACTIVE' ? 'danger' : 'secondary'}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={(e) => { e.stopPropagation(); toggleStatus(u); }}
                        >
                            {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </AdminButton>
                    )}
                </div>
            )
        }
    ];

    return (
        <div>
            <AdminPageHeader
                title="Admin Users"
                description="Manage platform administrators and support staff."
                actions={
                    <AdminButton onClick={() => navigate('/admin/users/new')}>
                        + New Admin
                    </AdminButton>
                }
            />

            <AdminTable
                columns={columns}
                data={admins}
                isLoading={loading}
                emptyMessage="No admin users found."
            />
        </div>
    );
}
