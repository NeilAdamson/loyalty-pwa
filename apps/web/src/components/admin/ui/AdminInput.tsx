import React, { InputHTMLAttributes } from 'react';

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

const AdminInput: React.FC<AdminInputProps> = ({
    label,
    error,
    helperText,
    style,
    ...props
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            {label && (
                <label style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)'
                }}>
                    {label}
                </label>
            )}
            <input
                style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg)',
                    border: error ? '1px solid var(--danger)' : '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    ...style
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                onBlur={(e) => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'}
                {...props}
            />
            {error && (
                <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span>
            )}
            {helperText && !error && (
                <span style={{ fontSize: '12px', color: '#666' }}>{helperText}</span>
            )}
        </div>
    );
};

export default AdminInput;
