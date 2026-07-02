import { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import AdminButton from '../../components/admin/ui/AdminButton';
import AdminTable from '../../components/admin/ui/AdminTable';

interface FraudEvent {
    audit_id: string;
    action: string;
    vendor_id: string | null;
    payload: Record<string, unknown>;
    created_at: string;
    vendor?: {
        trading_name: string;
        vendor_slug: string;
    } | null;
}

interface FraudEventsResponse {
    data: FraudEvent[];
    meta: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

function formatAction(action: string): string {
    return action.replace(/^FRAUD_/, '').replace(/_/g, ' ').toLowerCase();
}

function summarizePayload(payload: Record<string, unknown>): string {
    const parts: string[] = [];
    if (payload.staff_id) parts.push(`staff ${String(payload.staff_id).slice(0, 8)}…`);
    if (payload.card_id) parts.push(`card ${String(payload.card_id).slice(0, 8)}…`);
    if (payload.phone_e164) parts.push(String(payload.phone_e164));
    if (payload.ip_address) parts.push(`ip ${String(payload.ip_address)}`);
    if (payload.denial_count) parts.push(`${payload.denial_count} denials`);
    return parts.length > 0 ? parts.join(' · ') : JSON.stringify(payload);
}

export default function AdminFraudEvents() {
    const [events, setEvents] = useState<FraudEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

    useEffect(() => {
        fetchEvents();
    }, [page]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get<FraudEventsResponse>('/api/v1/admin/fraud-events', {
                params: { page, limit: 50 },
            });
            setEvents(Array.isArray(res.data.data) ? res.data.data : []);
            setMeta(res.data.meta ?? { page: 1, limit: 50, total: 0, pages: 1 });
        } catch (error) {
            console.error('Failed to fetch fraud events', error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    const exportCsv = () => {
        const header = ['created_at', 'action', 'vendor', 'details'];
        const rows = events.map((event) => [
            event.created_at,
            event.action,
            event.vendor?.trading_name ?? event.vendor_id ?? '',
            summarizePayload(event.payload),
        ]);
        const csv = [header, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fraud-events-page-${page}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const columns = useMemo(
        () => [
            {
                header: 'When',
                render: (event: FraudEvent) => new Date(event.created_at).toLocaleString(),
            },
            {
                header: 'Event',
                render: (event: FraudEvent) => (
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {formatAction(event.action)}
                    </span>
                ),
            },
            {
                header: 'Vendor',
                render: (event: FraudEvent) => event.vendor?.trading_name ?? '—',
            },
            {
                header: 'Details',
                render: (event: FraudEvent) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {summarizePayload(event.payload)}
                    </span>
                ),
            },
        ],
        []
    );

    return (
        <div>
            <AdminPageHeader
                title="Fraud flags"
                description="Rate-limit and repeated cooldown abuse events recorded by the platform."
            >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <AdminButton variant="secondary" onClick={exportCsv} disabled={events.length === 0}>
                        Export page CSV
                    </AdminButton>
                    <AdminButton variant="secondary" onClick={fetchEvents}>
                        Refresh
                    </AdminButton>
                </div>
            </AdminPageHeader>

            <AdminTable
                columns={columns}
                data={events}
                isLoading={loading}
                emptyMessage="No fraud flags recorded yet."
                keyField="audit_id"
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {meta.total} event{meta.total === 1 ? '' : 's'}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <AdminButton
                        variant="secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        disabled={page <= 1 || loading}
                        onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    >
                        Previous
                    </AdminButton>
                    <AdminButton
                        variant="secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        disabled={page >= meta.pages || loading}
                        onClick={() => setPage((current) => current + 1)}
                    >
                        Next
                    </AdminButton>
                </div>
            </div>
        </div>
    );
}
