import React from 'react';

interface AdminBadgeProps {
    status: string;
}

const AdminBadge: React.FC<AdminBadgeProps> = ({ status }) => {
    const s = status.toUpperCase();

    let styles = {
        background: 'rgba(255,255,255,0.1)',
        color: 'var(--text)',
        border: '1px solid var(--border)'
    };

    if (s === 'ACTIVE' || s === 'PAID') {
        styles = {
            background: 'rgba(34, 197, 94, 0.15)',
            color: 'var(--success)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
        };
    } else if (s === 'SUSPENDED' || s === 'OVERDUE' || s === 'DISABLED') {
        styles = {
            background: 'rgba(255, 77, 77, 0.15)',
            color: 'var(--danger)',
            border: '1px solid rgba(255, 77, 77, 0.2)'
        };
    } else if (s === 'TRIAL' || s === 'PENDING') {
        styles = {
            background: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--warning)',
            border: '1px solid rgba(245, 158, 11, 0.2)'
        };
    }

    return (
        <span style={{
            padding: '4px 8px',
            borderRadius: '100px',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'inline-block',
            ...styles
        }}>
            {status}
        </span>
    );
};

export default AdminBadge;
