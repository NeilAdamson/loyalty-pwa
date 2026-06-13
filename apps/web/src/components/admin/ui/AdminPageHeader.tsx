import { ReactNode } from 'react';
// import AdminButton from './AdminButton';

interface AdminPageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
    children?: ReactNode; // For filters/toolbar below header
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
    title,
    description,
    actions,
    children
}) => {
    return (
        <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
                <div>
                    <h1 style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>{title}</h1>
                    {description && (
                        <p style={{ marginTop: '4px', fontSize: '14px' }}>{description}</p>
                    )}
                </div>
                {actions && (
                    <div className="pageHeaderActions" style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {actions}
                    </div>
                )}
            </div>
            {children && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                    {children}
                </div>
            )}
            <style>{`
                @media (max-width: 640px) {
                    .flex-between {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                    }
                    .pageHeaderActions {
                        width: 100%;
                        flex-wrap: wrap;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminPageHeader;
