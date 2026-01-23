import React, { ReactNode } from 'react';
import AdminButton from './AdminButton';

interface AdminEmptyStateProps {
    title: string;
    description: string;
    icon?: ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({ title, description, icon, action }) => {
    return (
        <div className="adminEmptyState" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            textAlign: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-secondary)'
        }}>
            {icon && <div style={{ marginBottom: '16px', color: 'var(--text-tertiary)' }}>{icon}</div>}

            <h3 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '8px'
            }}>
                {title}
            </h3>

            <p style={{
                fontSize: '14px',
                maxWidth: '400px',
                margin: '0 auto 24px auto',
                lineHeight: '1.5'
            }}>
                {description}
            </p>

            {action && (
                <AdminButton onClick={action.onClick} variant="primary">
                    {action.label}
                </AdminButton>
            )}
        </div>
    );
};

export default AdminEmptyState;
