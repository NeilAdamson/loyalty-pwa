import React, { useEffect, useState } from 'react';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import { api } from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, subtext }: { title: string, value: string, subtext?: string }) => (
    <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    }}>
        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</h3>
        <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text)' }}>
            {value}
        </div>
        {subtext && <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{subtext}</div>}
    </div>
);

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        vendors: 0,
        members: 0,
        users: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data fetch or real if available. 
        // Since we don't have a dedicated "dashboard stats" endpoint yet, 
        // we could parallel fetch counts or just show placeholders.
        // For now, let's try to fetch lists and count them (inefficent but works for small scale) 
        // OR just leave 0 for now until backend supports it.
        // Actually, let's just fetch vendors count for real since we have that.

        async function loadStats() {
            try {
                // Parallel fetch
                const [vendorsRes, membersRes] = await Promise.allSettled([
                    api.get('/api/v1/admin/vendors'),
                    api.get('/api/v1/admin/members?limit=1') // minimize payload
                ]);

                let vendorCount = 0;
                let memberCount = 0;

                if (vendorsRes.status === 'fulfilled') {
                    vendorCount = vendorsRes.value.data.data?.length || 0;
                }

                // For members, our endpoint returns paginated data usually 
                // but let's assume we might need a dedicated stats endpoint later. 
                // For now, showing what we have.
                if (membersRes.status === 'fulfilled') {
                    // If the API returns a total count
                    memberCount = membersRes.value.data.meta?.total || 0;
                }

                setStats({
                    vendors: vendorCount,
                    members: memberCount,
                    users: 0 // We don't have a count endpoint for admin users handy without listing them all
                });
            } catch (err) {
                console.error("Failed to load dashboard stats", err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    return (
        <div>
            <AdminPageHeader
                title="Overview"
                description="Welcome back. Here is what's happening with your loyalty platform."
            />

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '24px',
                marginBottom: '32px'
            }}>
                <StatCard
                    title="Active Vendors"
                    value={loading ? "-" : stats.vendors.toString()}
                    subtext="Total businesses onboarded"
                />
                <StatCard
                    title="Total Members"
                    value={loading ? "-" : stats.members.toString()}
                    subtext="Across all vendors"
                />
                <StatCard
                    title="System Status"
                    value="Healthy"
                    subtext="All services operational"
                />
            </div>

            {/* Quick Actions / Recent Activity placeholder */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '24px',
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => navigate('/admin/vendors/new')}
                            style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: 'var(--primary)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                padding: '12px 16px',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            + Onboard Vendor
                        </button>
                        <button
                            onClick={() => navigate('/admin/users/new')}
                            style={{
                                background: 'transparent',
                                color: 'var(--text)',
                                border: '1px solid var(--border)',
                                padding: '12px 16px',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Add Admin User
                        </button>
                    </div>
                </div>

                <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '24px',
                    opacity: 0.7
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Recent Activity</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No recent activity to show.</p>
                </div>
            </div>
        </div>
    );
}
