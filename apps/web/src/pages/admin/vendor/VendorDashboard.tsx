import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../utils/api';

interface DashboardMetrics {
    total_members: number;
    active_members: number;
    total_stamps_30d: number;
    total_redemptions_30d: number;
    redemption_rate: string;
    outstanding_rewards: number;
}

interface ActivityItem {
    id: string;
    type: 'STAMP' | 'REDEEM';
    date: string;
    member_name: string;
    member_phone: string;
    staff_name: string;
}

const VendorDashboard: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { token } = useAuth();
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers = { 'Authorization': `Bearer ${token}` };

                const [metricsRes, activityRes] = await Promise.all([
                    api.get(`/api/v1/v/${slug}/admin/metrics`, { headers }),
                    api.get(`/api/v1/v/${slug}/admin/activity`, { headers })
                ]);

                setMetrics(metricsRes.data);
                setActivity(activityRes.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchData();
    }, [slug, token]);

    if (loading) return <div className="p-8 text-center text-muted">Loading dashboard...</div>;

    return (
        <div className="dashboard fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Real-time overview of your loyalty program.</p>
                </div>
            </div>

            {/* Metrics Grid - Horizontal Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '32px'
            }}>
                <MetricCard
                    title="Total Members"
                    value={metrics?.total_members || 0}
                    icon="👥"
                    trend={`${metrics?.active_members} active (90d)`}
                    iconBg="bg-purple-500/20"
                    iconColor="text-purple-400"
                />
                <MetricCard
                    title="Stamps (30d)"
                    value={metrics?.total_stamps_30d || 0}
                    icon="🎫"
                    iconBg="bg-yellow-500/20"
                    iconColor="text-yellow-400"
                />
                <MetricCard
                    title="Redemptions (30d)"
                    value={metrics?.total_redemptions_30d || 0}
                    icon="🎁"
                    iconBg="bg-red-500/20"
                    iconColor="text-red-400"
                />
                <MetricCard
                    title="Outstanding Rewards"
                    value={metrics?.outstanding_rewards || 0}
                    icon="⚠️"
                    trend="Liability Exposure"
                    iconBg="bg-orange-500/20"
                    iconColor="text-orange-400"
                />
            </div>

            {/* Recent Activity */}
            <div className="glass-panel p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>⚡</span> Recent Activity
                    </h2>
                </div>

                <div className="premium-table-container">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th style={{ width: '15%' }}>Type</th>
                                <th style={{ width: '35%' }}>Member</th>
                                <th style={{ width: '25%' }}>Staff Actions</th>
                                <th style={{ width: '25%' }}>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activity.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <span className={`badge ${item.type === 'REDEEM' ? 'badge-purple' : 'badge-primary'} flex items-center gap-1 w-fit`}>
                                            {item.type === 'REDEEM' ? '🎁' : '🎫'} {item.type}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white">{item.member_name}</span>
                                            <span className="text-xs text-muted font-mono">{item.member_phone}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white">
                                                {item.staff_name.charAt(0)}
                                            </div>
                                            <span className="text-sm text-dim">{item.staff_name}</span>
                                        </div>
                                    </td>
                                    <td className="text-sm text-muted">
                                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        <span className="text-dim ml-2">{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>
                                </tr>
                            ))}
                            {activity.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-muted flex flex-col items-center justify-center">
                                        <span className="text-4xl mb-2 opacity-20">💤</span>
                                        <p>No activity recorded yet.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MetricCard: React.FC<{ 
    title: string, 
    value: number | string, 
    icon: string, 
    trend?: string, 
    iconBg?: string,
    iconColor?: string
}> = ({ title, value, icon, trend, iconBg = 'bg-white/10', iconColor = 'text-white' }) => (
    <div style={{
        background: 'var(--bg-surface, rgba(30, 30, 30, 0.8))',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s ease',
        cursor: 'default'
    }}
    onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(40, 40, 40, 0.9)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    }}
    onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-surface, rgba(30, 30, 30, 0.8))';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    }}
    >
        {/* Header: Icon and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                background: iconBg.includes('bg-') ? '' : iconBg,
                backgroundColor: iconBg.includes('bg-') ? 
                    (iconBg.includes('purple') ? 'rgba(168, 85, 247, 0.2)' :
                     iconBg.includes('yellow') ? 'rgba(234, 179, 8, 0.2)' :
                     iconBg.includes('red') ? 'rgba(239, 68, 68, 0.2)' :
                     iconBg.includes('orange') ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.1)') : undefined
            }}>
                {icon}
            </div>
            <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-secondary, rgba(255, 255, 255, 0.6))',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                {title}
            </span>
        </div>

        {/* Value */}
        <div style={{
            fontSize: '32px',
            fontWeight: 700,
            color: iconColor.includes('text-') ? 
                (iconColor.includes('purple') ? '#a855f7' :
                 iconColor.includes('yellow') ? '#eab308' :
                 iconColor.includes('red') ? '#ef4444' :
                 iconColor.includes('orange') ? '#f97316' : '#ffffff') : '#ffffff',
            lineHeight: 1,
            marginTop: '4px'
        }}>
            {value}
        </div>

        {/* Trend/Sub-info */}
        {trend && (
            <div style={{
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: 'rgba(34, 197, 94, 0.9)',
                    fontWeight: 500
                }}>
                    <span>↗</span>
                    <span>{trend}</span>
                </div>
            </div>
        )}
    </div>
);

export default VendorDashboard;
