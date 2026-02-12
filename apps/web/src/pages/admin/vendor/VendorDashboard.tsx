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

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    title="Total Members"
                    value={metrics?.total_members || 0}
                    icon="👥"
                    trend={`${metrics?.active_members} active (90d)`}
                />
                <MetricCard
                    title="Stamps (30d)"
                    value={metrics?.total_stamps_30d || 0}
                    icon="🎫"
                    color="text-primary"
                />
                <MetricCard
                    title="Redemptions (30d)"
                    value={metrics?.total_redemptions_30d || 0}
                    icon="🎁"
                    color="text-secondary"
                />
                <MetricCard
                    title="Outstanding Rewards"
                    value={metrics?.outstanding_rewards || 0}
                    icon="⚠️"
                    trend="Liability Exposure"
                    color="text-yellow-400"
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

const MetricCard: React.FC<{ title: string, value: number | string, icon: string, trend?: string, color?: string }> = ({ title, value, icon, trend, color }) => (
    <div className="glass-panel p-6 flex flex-row items-center gap-4 hover:bg-white/5 transition duration-300">
        {/* Left: Icon Container */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-white/5 ${color ? color.replace('text-', 'bg-').replace('400', '500') + '/20' : 'bg-white/10'}`}>
            {icon}
        </div>

        {/* Right: Content */}
        <div className="flex flex-col flex-1">
            <span className="text-muted text-xs font-bold uppercase tracking-wider mb-1">{title}</span>
            <div className={`text-2xl font-bold ${color || 'text-white'} leading-none`}>{value}</div>

            {trend && (
                <div className="mt-2 flex items-center">
                    <span className="text-xs font-medium text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                        ↗ {trend}
                    </span>
                </div>
            )}
        </div>
    </div>
);

export default VendorDashboard;
