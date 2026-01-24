import React, { ReactNode } from 'react';

interface AuthShellProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
}

const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children }) => {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            padding: '24px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-lg)',
                padding: '32px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                        {title}
                    </h1>
                    {subtitle && <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{subtitle}</p>}
                </div>
                {children}
            </div>
        </div>
    );
};

export default AuthShell;
