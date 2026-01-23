import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import AdminTable from '../../components/admin/ui/AdminTable';
import AdminBadge from '../../components/admin/ui/AdminBadge';
import AdminInput from '../../components/admin/ui/AdminInput';

interface Member {
    member_id: string;
    name: string;
    phone_e164: string;
    status: string;
    created_at: string;
    stamps_count: number;
    vendor: {
        trading_name: string;
    }
}

export default function AdminMemberList() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchMembers();
    }, [debouncedSearch]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/v1/admin/members', {
                params: { q: debouncedSearch }
            });
            setMembers(Array.isArray(res.data.data) ? res.data.data : []);
        } catch (error) {
            console.error("Failed to fetch members", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (member: Member) => {
        if (!window.confirm(`Are you sure you want to ${member.status === 'ACTIVE' ? 'suspend' : 'activate'} ${member.name}?`)) return;

        try {
            const newStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
            await api.patch(`/api/v1/admin/members/${member.member_id}`, { status: newStatus });
            fetchMembers();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to update status');
        }
    };

    const columns = [
        { header: 'Name', accessor: 'name' as keyof Member },
        { header: 'Phone', accessor: 'phone_e164' as keyof Member },
        {
            header: 'Vendor',
            render: (m: Member) => <span style={{ color: 'var(--muted)' }}>{m.vendor?.trading_name || '-'}</span>
        },
        {
            header: 'Status',
            render: (m: Member) => <AdminBadge status={m.status || 'ACTIVE'} />
        },
        {
            header: 'Joined',
            render: (m: Member) => new Date(m.created_at).toLocaleDateString()
        },
        {
            header: 'Actions',
            render: (m: Member) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <AdminButton
                        variant={m.status === 'ACTIVE' ? 'danger' : 'secondary'}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={(e) => { e.stopPropagation(); toggleStatus(m); }}
                    >
                        {m.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </AdminButton>
                </div>
            )
        }
    ];

    return (
        <div>
            <AdminPageHeader
                title="Members"
                description="Global search across all loyalty programs."
            >
                <div style={{ maxWidth: '400px' }}>
                    <AdminInput
                        placeholder="Search by name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </AdminPageHeader>

            <AdminTable
                columns={columns}
                data={members}
                isLoading={loading}
                emptyMessage={search ? "No members found matching your search." : "No members found."}
            />
        </div>
    );
}
