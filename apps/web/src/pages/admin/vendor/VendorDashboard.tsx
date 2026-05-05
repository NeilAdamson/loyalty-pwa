import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../utils/api';

interface DashboardMetrics {
    total_members: number;
    new_members_30d: number;
    active_members_30d: number;
    total_stamps_30d: number;
    total_stamps_current_month: number;
    total_stamps_previous_month: number;
    total_redemptions_current_month: number;
    total_redemptions_previous_month: number;
    outstanding_rewards: number;
    card_completion_rate: number;
    average_time_to_reward_days: number;
    average_visit_value: number;
    reward_cost: number;
    estimated_revenue_current_month: number;
    total_reward_cost_current_month: number;
    estimated_roi_ratio: number;
    estimated_roi_label: string;
    repeat_visit_indicator_30d: number;
    behavior_insights: {
        stamps_by_day: Array<{ day: string; stamps: number }>;
        stamps_by_time_bucket: Array<{ bucket: string; stamps: number }>;
    };
    customer_insights: {
        top_customers_30d: Array<{ member_id: string; member_name: string; member_phone: string; stamps: number }>;
        at_risk_customers_30d: Array<{ member_id: string; name: string; phone_e164: string }>;
        near_reward_customers: Array<{ member_id: string; member_name: string; member_phone: string; stamps_remaining: number }>;
    };
    staff_activity: Array<{ staff_id: string; staff_name: string; stamps_issued: number; redemptions_processed: number }>;
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
                    trend={`${metrics?.active_members_30d || 0} active (30d) | ${metrics?.new_members_30d || 0} new`}
                    iconBg="bg-purple-500/20"
                    iconColor="text-purple-400"
                />
                <MetricCard
                    title="Current Month Stamps"
                    value={metrics?.total_stamps_current_month || 0}
                    icon="🎫"
                    trend={`Prev month: ${metrics?.total_stamps_previous_month || 0}`}
                    iconBg="bg-yellow-500/20"
                    iconColor="text-yellow-400"
                />
                <MetricCard
                    title="Current Month Redemptions"
                    value={metrics?.total_redemptions_current_month || 0}
                    icon="🎁"
                    trend={`Prev month: ${metrics?.total_redemptions_previous_month || 0}`}
                    iconBg="bg-red-500/20"
                    iconColor="text-red-400"
                />
                <MetricCard
                    title="Estimated Revenue (Current Month)"
                    value={formatCurrency(metrics?.estimated_revenue_current_month || 0)}
                    icon="💰"
                    trend={`Avg visit value: ${formatCurrency(metrics?.average_visit_value || 0)}`}
                    iconBg="bg-emerald-500/20"
                    iconColor="text-emerald-400"
                />
                <MetricCard
                    title="Estimated ROI"
                    value={metrics?.estimated_roi_label || 'N/A'}
                    icon="📈"
                    trend={`Reward cost: ${formatCurrency(metrics?.total_reward_cost_current_month || 0)}`}
                    iconBg="bg-blue-500/20"
                    iconColor="text-blue-400"
                />
                <MetricCard
                    title="Card Completion Rate"
                    value={`${((metrics?.card_completion_rate || 0) * 100).toFixed(1)}%`}
                    icon="✅"
                    trend={`Avg time to reward: ${metrics?.average_time_to_reward_days || 0} days`}
                    iconBg="bg-orange-500/20"
                    iconColor="text-orange-400"
                />
                <MetricCard
                    title="Repeat Visits (30d)"
                    value={`${metrics?.repeat_visit_indicator_30d || 0}%`}
                    icon="🔁"
                    trend={`Total stamps (30d): ${metrics?.total_stamps_30d || 0}`}
                    iconBg="bg-orange-500/20"
                    iconColor="text-orange-400"
                />
            </div>

            <div className="glass-panel p-6 mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>🕒</span> Peak Activity
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-semibold text-dim mb-3">By Day</h3>
                        <ul className="space-y-2">
                            {metrics?.behavior_insights.stamps_by_day.map((day) => (
                                <li key={day.day} className="flex justify-between text-sm text-white">
                                    <span>{day.day}</span>
                                    <span className="font-semibold">{day.stamps}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-dim mb-3">By Time Window</h3>
                        <ul className="space-y-2">
                            {metrics?.behavior_insights.stamps_by_time_bucket.map((bucket) => (
                                <li key={bucket.bucket} className="flex justify-between text-sm text-white">
                                    <span>{bucket.bucket}</span>
                                    <span className="font-semibold">{bucket.stamps}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <InsightList
                    title="Top Customers (30d)"
                    emptyText="No active customers in the last 30 days."
                    items={metrics?.customer_insights.top_customers_30d.map((customer) =>
                        `${customer.member_name} - ${customer.stamps} stamps`
                    ) || []}
                />
                <InsightList
                    title="At-Risk Customers"
                    emptyText="No at-risk customers right now."
                    items={metrics?.customer_insights.at_risk_customers_30d.map((customer) => customer.name) || []}
                />
                <InsightList
                    title="Near Reward Customers"
                    emptyText="No members are within 1-2 stamps of a reward."
                    items={metrics?.customer_insights.near_reward_customers.map((customer) =>
                        `${customer.member_name} - ${customer.stamps_remaining} to go`
                    ) || []}
                />
            </div>

            <div className="glass-panel p-6 mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>🧑‍💼</span> Staff Activity
                </h2>
                <div className="premium-table-container">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Stamps Issued</th>
                                <th>Redemptions Processed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics?.staff_activity.map((staff) => (
                                <tr key={staff.staff_id}>
                                    <td>{staff.staff_name}</td>
                                    <td>{staff.stamps_issued}</td>
                                    <td>{staff.redemptions_processed}</td>
                                </tr>
                            ))}
                            {(!metrics?.staff_activity || metrics.staff_activity.length === 0) && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-muted">No staff activity yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value || 0);
};

const InsightList: React.FC<{ title: string; items: string[]; emptyText: string }> = ({ title, items, emptyText }) => (
    <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        {items.length === 0 ? (
            <p className="text-sm text-muted">{emptyText}</p>
        ) : (
            <ul className="space-y-2">
                {items.map((item) => (
                    <li key={item} className="text-sm text-white/90">{item}</li>
                ))}
            </ul>
        )}
    </div>
);

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
