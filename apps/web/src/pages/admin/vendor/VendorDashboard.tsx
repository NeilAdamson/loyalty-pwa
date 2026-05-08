import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../utils/api';

const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || fallback;
    }
    return fallback;
};

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
        at_risk_customers_30d: Array<{ member_id: string; name: string; phone_e164: string; last_active_at?: string | null }>;
        near_reward_customers: Array<{ member_id: string; member_name: string; member_phone: string; stamps_remaining: number; stamps_count?: number; stamps_required?: number }>;
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

type NudgeAudience = 'NEAR_REWARD' | 'AT_RISK_30D';

interface NudgePreview {
    audience: NudgeAudience;
    provider_configured: boolean;
    recipient_count: number;
    audience_count: number;
    excluded_no_consent_count: number;
    excluded_invalid_phone_count: number;
    max_recipients_per_send: number;
    message_template: string;
    message_preview: string;
    estimated_segments: number;
    estimate_note: string;
    sample_recipients: Array<{
        member_id: string;
        name: string;
        phone_tail: string;
        stamps_remaining?: number;
        last_active_at?: string | null;
    }>;
}

interface NudgeSendResult {
    success: boolean;
    requested_count: number;
    sent_count: number;
    failed_count: number;
    estimated_segments: number;
}

const VendorDashboard: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { token } = useAuth();
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [nudgeAudience, setNudgeAudience] = useState<NudgeAudience | null>(null);
    const [nudgePreview, setNudgePreview] = useState<NudgePreview | null>(null);
    const [nudgeMessage, setNudgeMessage] = useState('');
    const [nudgeLoading, setNudgeLoading] = useState(false);
    const [nudgeSending, setNudgeSending] = useState(false);
    const [nudgeError, setNudgeError] = useState('');
    const [nudgeResult, setNudgeResult] = useState<NudgeSendResult | null>(null);
    const [acknowledgeCosts, setAcknowledgeCosts] = useState(false);

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

    const openNudgeModal = async (audience: NudgeAudience) => {
        if (!token || !slug) return;

        setNudgeAudience(audience);
        setNudgePreview(null);
        setNudgeMessage('');
        setNudgeError('');
        setNudgeResult(null);
        setAcknowledgeCosts(false);
        setNudgeLoading(true);

        try {
            const res = await api.get<NudgePreview>(`/api/v1/v/${slug}/admin/nudges/preview`, {
                params: { audience },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNudgePreview(res.data);
            setNudgeMessage(res.data.message_template);
        } catch (error: unknown) {
            setNudgeError(getApiErrorMessage(error, 'Failed to load nudge preview'));
        } finally {
            setNudgeLoading(false);
        }
    };

    const closeNudgeModal = () => {
        if (nudgeSending) return;
        setNudgeAudience(null);
        setNudgePreview(null);
        setNudgeMessage('');
        setNudgeError('');
        setNudgeResult(null);
        setAcknowledgeCosts(false);
    };

    const sendNudge = async () => {
        if (!token || !slug || !nudgeAudience || !nudgePreview) return;

        setNudgeSending(true);
        setNudgeError('');
        setNudgeResult(null);

        try {
            const res = await api.post<NudgeSendResult>(
                `/api/v1/v/${slug}/admin/nudges/send`,
                {
                    audience: nudgeAudience,
                    message: nudgeMessage,
                    confirm: true,
                    expected_recipient_count: nudgePreview.recipient_count
                },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setNudgeResult(res.data);
        } catch (error: unknown) {
            setNudgeError(getApiErrorMessage(error, 'Failed to send nudge'));
        } finally {
            setNudgeSending(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted">Loading dashboard...</div>;

    return (
        <div className="dashboard fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        Vendor manager view (Admin staff role). Counter staff use Stamper logins — share bookmarks from
                        Settings.
                    </p>
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

            <PeakActivityPanel behavior={metrics?.behavior_insights} totalStamps30d={metrics?.total_stamps_30d ?? 0} />

            <div className="vendor-dash-insight-grid">
                <CustomerInsightColumn
                    variant="top"
                    title="Top customers"
                    subtitle="Most stamps in the last 30 days"
                    emoji="🏆"
                    emptyText="No stamp activity in the last 30 days yet — share your QR and keep stamping!"
                    customers={metrics?.customer_insights.top_customers_30d ?? []}
                />
                <CustomerInsightColumn
                    variant="risk"
                    title="Needs attention"
                    subtitle="No stamps for 30+ days"
                    emoji="🌵"
                    emptyText="Nobody has gone quiet long enough to flag — you're all caught up."
                    atRisk={metrics?.customer_insights.at_risk_customers_30d ?? []}
                    onNudge={() => openNudgeModal('AT_RISK_30D')}
                />
                <CustomerInsightColumn
                    variant="near"
                    title="Almost there"
                    subtitle="1–2 stamps from a reward"
                    emoji="✨"
                    emptyText="No one is one stamp away — full cards will show up here."
                    nearReward={metrics?.customer_insights.near_reward_customers ?? []}
                    onNudge={() => openNudgeModal('NEAR_REWARD')}
                />
            </div>

            <section className="glass-panel vendor-dash-section">
                <div className="vendor-dash-section-head">
                    <h2 className="vendor-dash-section-title">
                        <span aria-hidden>🧑‍💼</span> Staff activity
                    </h2>
                    <span className="vendor-dash-section-chip">
                        {metrics?.staff_activity.length ?? 0} staff
                    </span>
                </div>
                <div className="vendor-dash-table-wrap">
                    <table className="vendor-dash-table">
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
                                    <td colSpan={3}>
                                        <div className="vendor-dash-empty-row">
                                            <span className="vendor-dash-empty-icon" aria-hidden>🪪</span>
                                            <p>No staff activity yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Recent Activity */}
            <section className="glass-panel vendor-dash-section">
                <div className="vendor-dash-section-head">
                    <h2 className="vendor-dash-section-title">
                        <span aria-hidden>⚡</span> Recent activity
                    </h2>
                    <span className="vendor-dash-section-chip">{activity.length} events</span>
                </div>

                <div className="vendor-dash-table-wrap">
                    <table className="vendor-dash-table">
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
                                        <span
                                            className={`vendor-dash-type-pill ${
                                                item.type === 'REDEEM'
                                                    ? 'vendor-dash-type-pill--redeem'
                                                    : 'vendor-dash-type-pill--stamp'
                                            }`}
                                        >
                                            {item.type === 'REDEEM' ? '🎁' : '🎫'} {item.type}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="vendor-dash-member-block">
                                            <span className="vendor-dash-member-name">{item.member_name}</span>
                                            <span className="vendor-dash-member-phone">{item.member_phone}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="vendor-dash-staff-cell">
                                            <div className="vendor-dash-staff-avatar" aria-hidden>
                                                {item.staff_name.charAt(0)}
                                            </div>
                                            <span className="vendor-dash-staff-name">{item.staff_name}</span>
                                        </div>
                                    </td>
                                    <td className="vendor-dash-time-cell">
                                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        <span className="vendor-dash-time-sub">
                                            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {activity.length === 0 && (
                                <tr>
                                    <td colSpan={4}>
                                        <div className="vendor-dash-empty-row vendor-dash-empty-row--large">
                                            <span className="vendor-dash-empty-icon" aria-hidden>💤</span>
                                            <p>No activity recorded yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {nudgeAudience && (
                <NudgeModal
                    audience={nudgeAudience}
                    preview={nudgePreview}
                    message={nudgeMessage}
                    loading={nudgeLoading}
                    sending={nudgeSending}
                    error={nudgeError}
                    result={nudgeResult}
                    acknowledgeCosts={acknowledgeCosts}
                    onMessageChange={setNudgeMessage}
                    onAcknowledgeCostsChange={setAcknowledgeCosts}
                    onClose={closeNudgeModal}
                    onSend={sendNudge}
                />
            )}

            <style>{VENDOR_DASHBOARD_CSS}</style>
        </div>
    );
};

const VENDOR_DASHBOARD_CSS = `
.vendor-dash-insight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(272px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}
.vendor-dash-peak-wrap {
  padding: 1.5rem;
  margin-bottom: 2rem;
}
.vendor-dash-peak-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}
.vendor-dash-peak-title-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.vendor-dash-peak-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
}
.vendor-dash-peak-chip {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
  border: 1px solid rgba(239, 68, 68, 0.35);
}
.vendor-dash-peak-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}
@media (min-width: 900px) {
  .vendor-dash-peak-grid {
    grid-template-columns: 1fr 1fr;
  }
}
.vendor-dash-peak-col-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--text-dim);
  margin: 0 0 1rem 0;
}
.vendor-dash-bar-row {
  display: grid;
  grid-template-columns: 2.25rem 1fr 1.75rem;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.55rem;
}
.vendor-dash-bar-track {
  height: 11px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
}
.vendor-dash-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ef4444 0%, #f97316 45%, #eab308 100%);
  transition: width 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.4);
}
.vendor-dash-bar-fill--cool {
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 55%, #a855f7 100%);
  box-shadow: 0 0 14px rgba(59, 130, 246, 0.35);
}
.vendor-dash-bar-count {
  font-size: 0.8125rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #fff;
  text-align: right;
}
.vendor-dash-bar-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
  font-variant-numeric: tabular-nums;
}
.vendor-dash-peak-empty {
  padding: 1rem;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.04);
  border: 1px dashed rgba(255,255,255,0.12);
  color: var(--text-dim);
  font-size: 0.875rem;
  text-align: center;
}
.vendor-dash-insight-card {
  padding: 1.25rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(155deg, rgba(42, 42, 54, 0.92), rgba(14, 14, 22, 0.98));
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: var(--glass-shadow);
  min-height: 240px;
  display: flex;
  flex-direction: column;
}
.vendor-dash-insight-card--top { border-top: 4px solid #eab308; }
.vendor-dash-insight-card--risk { border-top: 4px solid #f97316; }
.vendor-dash-insight-card--near { border-top: 4px solid #a855f7; }
.vendor-dash-insight-head {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.vendor-dash-insight-heading {
  flex: 1;
  min-width: 0;
}
.vendor-dash-insight-icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  flex-shrink: 0;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
}
.vendor-dash-insight-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #fff;
}
.vendor-dash-insight-sub {
  margin: 0.15rem 0 0 0;
  font-size: 0.78rem;
  color: var(--text-dim);
  font-weight: 500;
}
.vendor-dash-nudge-btn {
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.06);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  border-radius: 10px;
  padding: 0.45rem 0.65rem;
  cursor: pointer;
  flex-shrink: 0;
}
.vendor-dash-nudge-btn:hover {
  background: rgba(255,255,255,0.12);
}
.vendor-dash-insight-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.vendor-dash-person-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.65rem;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
}
.vendor-dash-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(239,68,68,0.35), rgba(234,179,8,0.25));
  color: #fff;
}
.vendor-dash-person-main {
  flex: 1;
  min-width: 0;
}
.vendor-dash-person-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vendor-dash-person-meta {
  font-size: 0.72rem;
  color: var(--text-dim);
  margin-top: 0.12rem;
}
.vendor-dash-pill {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.28rem 0.45rem;
  border-radius: 8px;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.vendor-dash-pill--gold {
  background: rgba(234, 179, 8, 0.18);
  color: #fde047;
  border: 1px solid rgba(234, 179, 8, 0.35);
}
.vendor-dash-pill--risk {
  background: rgba(249, 115, 22, 0.15);
  color: #fdba74;
  border: 1px solid rgba(249, 115, 22, 0.35);
}
.vendor-dash-pill--purple {
  background: rgba(168, 85, 247, 0.15);
  color: #e9d5ff;
  border: 1px solid rgba(168, 85, 247, 0.35);
}
.vendor-dash-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.25rem 0.75rem;
  color: var(--text-dim);
  font-size: 0.875rem;
  line-height: 1.45;
}
.vendor-dash-empty-emoji {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.85;
}
.vendor-dash-section {
  padding: 1.35rem;
  margin-bottom: 2rem;
}
.vendor-dash-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.vendor-dash-section-title {
  margin: 0;
  color: #fff;
  font-size: 1.12rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
}
.vendor-dash-section-chip {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #cbd5e1;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05);
}
.vendor-dash-table-wrap {
  overflow: auto;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.02);
}
.vendor-dash-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}
.vendor-dash-table th {
  text-align: left;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  padding: 0.8rem 0.95rem;
  border-bottom: 1px solid rgba(255,255,255,0.09);
  background: rgba(255,255,255,0.03);
}
.vendor-dash-table td {
  padding: 0.85rem 0.95rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.92);
  font-size: 0.88rem;
}
.vendor-dash-table tbody tr:last-child td {
  border-bottom: none;
}
.vendor-dash-table tbody tr:hover td {
  background: rgba(255,255,255,0.03);
}
.vendor-dash-empty-row {
  text-align: center;
  color: var(--text-dim);
  padding: 1.4rem 0.75rem;
}
.vendor-dash-empty-row p {
  margin: 0;
}
.vendor-dash-empty-row--large {
  padding: 2rem 1rem;
}
.vendor-dash-empty-icon {
  display: block;
  font-size: 1.6rem;
  margin-bottom: 0.45rem;
  opacity: 0.8;
}
.vendor-dash-type-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.28rem 0.5rem;
  border-radius: 9px;
  letter-spacing: 0.04em;
}
.vendor-dash-type-pill--stamp {
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.14);
}
.vendor-dash-type-pill--redeem {
  color: #d8b4fe;
  border: 1px solid rgba(168, 85, 247, 0.35);
  background: rgba(168, 85, 247, 0.14);
}
.vendor-dash-member-block {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}
.vendor-dash-member-name {
  font-weight: 700;
  color: #fff;
}
.vendor-dash-member-phone {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.vendor-dash-staff-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.vendor-dash-staff-avatar {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.vendor-dash-staff-name {
  color: var(--text-muted);
  font-size: 0.84rem;
}
.vendor-dash-time-cell {
  color: var(--text-muted);
  font-size: 0.8rem;
}
.vendor-dash-time-sub {
  margin-left: 0.45rem;
  color: var(--text-dim);
}
.vendor-dash-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(8px);
}
.vendor-dash-nudge-modal {
  width: min(720px, 100%);
  max-height: min(90vh, 820px);
  overflow: auto;
  border-radius: 18px;
  padding: 1.5rem;
  background: #12121a;
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 28px 80px rgba(0,0,0,0.45);
}
.vendor-dash-modal-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.vendor-dash-modal-title {
  margin: 0;
  color: #fff;
  font-size: 1.3rem;
  font-weight: 800;
}
.vendor-dash-modal-subtitle {
  margin: 0.25rem 0 0;
  color: var(--text-dim);
  font-size: 0.88rem;
}
.vendor-dash-modal-close {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: #fff;
  cursor: pointer;
}
.vendor-dash-nudge-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.vendor-dash-nudge-summary > div {
  padding: 0.8rem;
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
}
.vendor-dash-nudge-summary span,
.vendor-dash-nudge-label,
.vendor-dash-nudge-preview span,
.vendor-dash-nudge-sample span {
  display: block;
  color: var(--text-dim);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.vendor-dash-nudge-summary strong {
  display: block;
  margin-top: 0.25rem;
  color: #fff;
  font-size: 1.35rem;
}
.vendor-dash-nudge-textarea {
  width: 100%;
  min-height: 8.5rem;
  margin-top: 0.5rem;
  padding: 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.06);
  color: #fff;
  resize: vertical;
  outline: none;
}
.vendor-dash-nudge-help {
  margin: 0.45rem 0 1rem;
  color: var(--text-dim);
  font-size: 0.78rem;
}
.vendor-dash-nudge-preview,
.vendor-dash-nudge-sample {
  padding: 0.9rem;
  margin-bottom: 1rem;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
}
.vendor-dash-nudge-preview p {
  margin: 0.45rem 0 0;
  color: rgba(255,255,255,0.9);
  line-height: 1.5;
}
.vendor-dash-nudge-sample ul {
  margin: 0.55rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.4rem;
}
.vendor-dash-nudge-sample li {
  color: rgba(255,255,255,0.9);
  font-size: 0.85rem;
}
.vendor-dash-nudge-sample small {
  color: var(--text-dim);
  margin-left: 0.35rem;
}
.vendor-dash-cost-ack {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin-bottom: 1rem;
  color: rgba(255,255,255,0.88);
  font-size: 0.86rem;
  line-height: 1.45;
}
.vendor-dash-nudge-warning,
.vendor-dash-nudge-error,
.vendor-dash-nudge-success,
.vendor-dash-modal-state {
  padding: 0.85rem;
  margin-bottom: 1rem;
  border-radius: 12px;
  font-size: 0.88rem;
  line-height: 1.45;
}
.vendor-dash-nudge-warning {
  color: #fde68a;
  background: rgba(234,179,8,0.12);
  border: 1px solid rgba(234,179,8,0.28);
}
.vendor-dash-nudge-error {
  color: #fecaca;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.28);
}
.vendor-dash-nudge-success {
  color: #bbf7d0;
  background: rgba(34,197,94,0.12);
  border: 1px solid rgba(34,197,94,0.28);
}
.vendor-dash-modal-state {
  color: var(--text-muted);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
}
.vendor-dash-modal-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
}
`;

type InsightColumnProps =
    | {
          variant: 'top';
          title: string;
          subtitle: string;
          emoji: string;
          emptyText: string;
          customers: DashboardMetrics['customer_insights']['top_customers_30d'];
          onNudge?: never;
      }
    | {
          variant: 'risk';
          title: string;
          subtitle: string;
          emoji: string;
          emptyText: string;
          atRisk: DashboardMetrics['customer_insights']['at_risk_customers_30d'];
          onNudge: () => void;
      }
    | {
          variant: 'near';
          title: string;
          subtitle: string;
          emoji: string;
          emptyText: string;
          nearReward: DashboardMetrics['customer_insights']['near_reward_customers'];
          onNudge: () => void;
      };

const PeakActivityPanel: React.FC<{
    behavior?: DashboardMetrics['behavior_insights'];
    totalStamps30d: number;
}> = ({ behavior, totalStamps30d }) => {
    const days = behavior?.stamps_by_day ?? [];
    const buckets = behavior?.stamps_by_time_bucket ?? [];
    const maxDay = Math.max(1, ...days.map((d) => d.stamps));
    const maxBucket = Math.max(1, ...buckets.map((b) => b.stamps));
    const hasAny = totalStamps30d > 0 || days.some((d) => d.stamps > 0) || buckets.some((b) => b.stamps > 0);

    const shortDay = (label: string) =>
        label.length <= 3 ? label.toUpperCase() : label.slice(0, 3).toUpperCase();

    return (
        <div className="glass-panel vendor-dash-peak-wrap">
            <div className="vendor-dash-peak-head">
                <div className="vendor-dash-peak-title-row">
                    <span style={{ fontSize: '1.5rem', lineHeight: 1 }} aria-hidden>📊</span>
                    <div>
                        <h2 className="vendor-dash-peak-title">Peak activity</h2>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                            Where your stamps cluster — rolling 30 days
                        </p>
                    </div>
                </div>
                <span className="vendor-dash-peak-chip">{totalStamps30d} stamps · 30d</span>
            </div>

            {!hasAny ? (
                <div className="vendor-dash-peak-empty">
                    No stamp rhythm yet. Once members start visiting, you&apos;ll see day-of-week and time-of-day
                    patterns here.
                </div>
            ) : (
                <div className="vendor-dash-peak-grid">
                    <div>
                        <h3 className="vendor-dash-peak-col-title">By weekday</h3>
                        {days.map((day) => (
                            <div key={day.day} className="vendor-dash-bar-row">
                                <span className="vendor-dash-bar-label">{shortDay(day.day)}</span>
                                <div className="vendor-dash-bar-track" title={`${day.day}: ${day.stamps} stamps`}>
                                    <div
                                        className="vendor-dash-bar-fill"
                                        style={{ width: `${Math.round((day.stamps / maxDay) * 100)}%` }}
                                    />
                                </div>
                                <span className="vendor-dash-bar-count">{day.stamps}</span>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h3 className="vendor-dash-peak-col-title">By time of day</h3>
                        {buckets.map((bucket) => (
                            <div key={bucket.bucket} className="vendor-dash-bar-row">
                                <span className="vendor-dash-bar-label">{bucket.bucket}</span>
                                <div className="vendor-dash-bar-track" title={`${bucket.bucket}: ${bucket.stamps} stamps`}>
                                    <div
                                        className="vendor-dash-bar-fill vendor-dash-bar-fill--cool"
                                        style={{ width: `${Math.round((bucket.stamps / maxBucket) * 100)}%` }}
                                    />
                                </div>
                                <span className="vendor-dash-bar-count">{bucket.stamps}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function maskPhoneTail(e164: string): string {
    const digits = e164.replace(/\D/g, '');
    if (digits.length < 4) return '···';
    return `···${digits.slice(-4)}`;
}

function formatQuietSince(iso: string | null | undefined): string {
    if (!iso) return 'No recent visits recorded';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'No recent visits recorded';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days >= 45) return `Quiet ~${Math.max(1, Math.round(days / 30))} mo`;
    if (days >= 7) return `Quiet ${days} days`;
    return `Last ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

const CustomerInsightColumn: React.FC<InsightColumnProps> = (props) => {
    const cardClass =
        props.variant === 'top'
            ? 'vendor-dash-insight-card vendor-dash-insight-card--top'
            : props.variant === 'risk'
              ? 'vendor-dash-insight-card vendor-dash-insight-card--risk'
              : 'vendor-dash-insight-card vendor-dash-insight-card--near';

    let body: React.ReactNode = null;

    if (props.variant === 'top') {
        const rows = props.customers.filter((c) => c.stamps > 0);
        body =
            rows.length === 0 ? (
                <div className="vendor-dash-empty">
                    <span className="vendor-dash-empty-emoji">☕</span>
                    {props.emptyText}
                </div>
            ) : (
                <ul className="vendor-dash-insight-list">
                    {rows.map((c, idx) => (
                        <li key={c.member_id}>
                            <div className="vendor-dash-person-row">
                                <div className="vendor-dash-avatar" aria-hidden>
                                    {initials(c.member_name || '?')}
                                </div>
                                <div className="vendor-dash-person-main">
                                    <div className="vendor-dash-person-name">{c.member_name}</div>
                                    <div className="vendor-dash-person-meta">{maskPhoneTail(c.member_phone)}</div>
                                </div>
                                <span className="vendor-dash-pill vendor-dash-pill--gold">
                                    #{idx + 1} · {c.stamps} st
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            );
    } else if (props.variant === 'risk') {
        body =
            props.atRisk.length === 0 ? (
                <div className="vendor-dash-empty">
                    <span className="vendor-dash-empty-emoji">✅</span>
                    {props.emptyText}
                </div>
            ) : (
                <ul className="vendor-dash-insight-list">
                    {props.atRisk.map((c) => (
                        <li key={c.member_id}>
                            <div className="vendor-dash-person-row">
                                <div className="vendor-dash-avatar" aria-hidden>
                                    {initials(c.name || '?')}
                                </div>
                                <div className="vendor-dash-person-main">
                                    <div className="vendor-dash-person-name">{c.name}</div>
                                    <div className="vendor-dash-person-meta">
                                        {formatQuietSince(c.last_active_at)} · {maskPhoneTail(c.phone_e164)}
                                    </div>
                                </div>
                                <span className="vendor-dash-pill vendor-dash-pill--risk">Nudge</span>
                            </div>
                        </li>
                    ))}
                </ul>
            );
    } else {
        body =
            props.nearReward.length === 0 ? (
                <div className="vendor-dash-empty">
                    <span className="vendor-dash-empty-emoji">🎯</span>
                    {props.emptyText}
                </div>
            ) : (
                <ul className="vendor-dash-insight-list">
                    {props.nearReward.map((c) => (
                        <li key={c.member_id}>
                            <div className="vendor-dash-person-row">
                                <div className="vendor-dash-avatar" aria-hidden>
                                    {initials(c.member_name || '?')}
                                </div>
                                <div className="vendor-dash-person-main">
                                    <div className="vendor-dash-person-name">{c.member_name}</div>
                                    <div className="vendor-dash-person-meta">
                                        {typeof c.stamps_count === 'number' &&
                                        typeof c.stamps_required === 'number'
                                            ? `${c.stamps_count}/${c.stamps_required} stamps`
                                            : `${c.stamps_remaining} stamp${c.stamps_remaining === 1 ? '' : 's'} to reward`}
                                    </div>
                                </div>
                                <span className="vendor-dash-pill vendor-dash-pill--purple">
                                    {c.stamps_remaining} left
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            );
    }

    return (
        <div className={cardClass}>
            <div className="vendor-dash-insight-head">
                <div className="vendor-dash-insight-icon" aria-hidden>
                    {props.emoji}
                </div>
                <div className="vendor-dash-insight-heading">
                    <h3 className="vendor-dash-insight-title">{props.title}</h3>
                    <p className="vendor-dash-insight-sub">{props.subtitle}</p>
                </div>
                {props.onNudge && (
                    <button type="button" className="vendor-dash-nudge-btn" onClick={props.onNudge}>
                        Send nudge
                    </button>
                )}
            </div>
            {body}
        </div>
    );
};

const nudgeAudienceLabel = (audience: NudgeAudience): string =>
    audience === 'NEAR_REWARD' ? 'Almost there customers' : 'Needs attention customers';

const NudgeModal: React.FC<{
    audience: NudgeAudience;
    preview: NudgePreview | null;
    message: string;
    loading: boolean;
    sending: boolean;
    error: string;
    result: NudgeSendResult | null;
    acknowledgeCosts: boolean;
    onMessageChange: (value: string) => void;
    onAcknowledgeCostsChange: (value: boolean) => void;
    onClose: () => void;
    onSend: () => void;
}> = ({
    audience,
    preview,
    message,
    loading,
    sending,
    error,
    result,
    acknowledgeCosts,
    onMessageChange,
    onAcknowledgeCostsChange,
    onClose,
    onSend
}) => {
    const canSend = Boolean(
        preview &&
        preview.provider_configured &&
        preview.recipient_count > 0 &&
        preview.recipient_count <= preview.max_recipients_per_send &&
        acknowledgeCosts &&
        !sending &&
        !result
    );

    return (
        <div className="vendor-dash-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="nudge-modal-title">
            <div className="vendor-dash-nudge-modal">
                <div className="vendor-dash-modal-head">
                    <div>
                        <h2 id="nudge-modal-title" className="vendor-dash-modal-title">Send manual nudge</h2>
                        <p className="vendor-dash-modal-subtitle">{nudgeAudienceLabel(audience)}</p>
                    </div>
                    <button type="button" className="vendor-dash-modal-close" onClick={onClose} disabled={sending}>
                        x
                    </button>
                </div>

                {loading ? (
                    <div className="vendor-dash-modal-state">Loading nudge preview...</div>
                ) : preview ? (
                    <>
                        <div className="vendor-dash-nudge-summary">
                            <div>
                                <span>Recipients</span>
                                <strong>{preview.recipient_count}</strong>
                            </div>
                            <div>
                                <span>No consent</span>
                                <strong>{preview.excluded_no_consent_count}</strong>
                            </div>
                            <div>
                                <span>Invalid phone</span>
                                <strong>{preview.excluded_invalid_phone_count}</strong>
                            </div>
                            <div>
                                <span>Est. segments</span>
                                <strong>{preview.estimated_segments}</strong>
                            </div>
                        </div>

                        {!preview.provider_configured && (
                            <div className="vendor-dash-nudge-warning">
                                SMS provider is not configured. Sending is disabled.
                            </div>
                        )}
                        {preview.recipient_count > preview.max_recipients_per_send && (
                            <div className="vendor-dash-nudge-warning">
                                This audience exceeds the manual send limit of {preview.max_recipients_per_send} recipients.
                            </div>
                        )}

                        <label className="vendor-dash-nudge-label" htmlFor="nudge-message">
                            Message
                        </label>
                        <textarea
                            id="nudge-message"
                            className="vendor-dash-nudge-textarea"
                            value={message}
                            onChange={(e) => onMessageChange(e.target.value)}
                            maxLength={320}
                            disabled={sending || Boolean(result)}
                        />
                        <div className="vendor-dash-nudge-help">
                            {message.length}/320 characters. Supported placeholders: {'{name}'}, {'{vendor}'}, {'{reward}'}, {'{stamps_remaining}'}.
                        </div>

                        <div className="vendor-dash-nudge-preview">
                            <span>Preview</span>
                            <p>{message === preview.message_template ? preview.message_preview : 'Edited message will be rendered per customer when sent.'}</p>
                        </div>

                        {preview.sample_recipients.length > 0 && (
                            <div className="vendor-dash-nudge-sample">
                                <span>Sample recipients</span>
                                <ul>
                                    {preview.sample_recipients.map((recipient) => (
                                        <li key={recipient.member_id}>
                                            {recipient.name} <small>{recipient.phone_tail}</small>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <label className="vendor-dash-cost-ack">
                            <input
                                type="checkbox"
                                checked={acknowledgeCosts}
                                onChange={(e) => onAcknowledgeCostsChange(e.target.checked)}
                                disabled={sending || Boolean(result)}
                            />
                            <span>I understand this will send paid SMS messages to opted-in customers.</span>
                        </label>

                        {error && <div className="vendor-dash-nudge-error">{error}</div>}
                        {result && (
                            <div className={result.failed_count > 0 ? 'vendor-dash-nudge-warning' : 'vendor-dash-nudge-success'}>
                                Sent {result.sent_count} of {result.requested_count} nudges. Estimated segments: {result.estimated_segments}.
                            </div>
                        )}

                        <div className="vendor-dash-modal-actions">
                            <button type="button" className="btn-ghost" onClick={onClose} disabled={sending}>
                                {result ? 'Close' : 'Cancel'}
                            </button>
                            {!result && (
                                <button type="button" className="btn-premium" onClick={onSend} disabled={!canSend}>
                                    {sending ? 'Sending...' : `Send ${preview.recipient_count} nudge${preview.recipient_count === 1 ? '' : 's'}`}
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="vendor-dash-modal-state">Preview unavailable.</div>
                )}
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
