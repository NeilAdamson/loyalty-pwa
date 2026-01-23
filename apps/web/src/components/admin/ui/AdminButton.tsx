import React, { ButtonHTMLAttributes } from 'react';

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    isLoading?: boolean;
    fullWidth?: boolean;
}

const AdminButton: React.FC<AdminButtonProps> = ({
    children,
    variant = 'primary',
    isLoading = false,
    fullWidth = false,
    className = '',
    disabled,
    style,
    ...props
}) => {
    const baseStyles: React.CSSProperties = {
        padding: '10px 16px',
        borderRadius: 'var(--radius)',
        border: 'none',
        fontSize: '14px',
        fontWeight: 600,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled || isLoading ? 0.7 : 1,
        width: fullWidth ? '100%' : 'auto',
        ...style
    };

    const variants = {
        primary: {
            background: 'var(--primary)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(79,124,255,0.3)'
        },
        secondary: {
            background: 'var(--surface)',  // Fixed from surface-2
            color: 'var(--text)',
            border: '1px solid var(--border)'
        },
        danger: {
            background: 'var(--danger)',
            color: 'white'
        }
    };

    return (
        <button
            style={{ ...baseStyles, ...variants[variant] }}
            disabled={disabled || isLoading}
            className={className}
            {...props}
        >
            {isLoading ? 'Loading...' : children}
        </button>
    );
};

export default AdminButton;
