import React, { InputHTMLAttributes, SelectHTMLAttributes, useId } from 'react';

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement | HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    options?: { value: string; label: string }[];
    /** Show asterisk for required fields */
    required?: boolean;
}

const AdminInput: React.FC<AdminInputProps> = ({
    label,
    error,
    helperText,
    style,
    options,
    type,
    required,
    id,
    'aria-describedby': ariaDescribedBy,
    ...props
}) => {
    const generatedId = useId();
    const inputId = id || `admin-input-${generatedId.replace(/:/g, '')}`;
    const helperId = helperText ? `${inputId}-help` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [ariaDescribedBy, errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            {label && (
                <label
                    htmlFor={inputId}
                    style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-secondary)'
                    }}
                >
                    {label}
                    {required && <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span>}
                </label>
            )}
            {type === 'select' ? (
                <select
                    id={inputId}
                    required={required}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    style={{
                        padding: '12px 14px',
                        minHeight: '44px',
                        borderRadius: 'var(--radius)',
                        background: 'var(--bg)',
                        border: error ? '1px solid var(--danger)' : '1px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        width: '100%',
                        ...style
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'}
                    {...props as SelectHTMLAttributes<HTMLSelectElement>}
                >
                    {options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : (
                <input
                    id={inputId}
                    type={type}
                    required={required}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    style={{
                        padding: '12px 14px',
                        minHeight: '44px',
                        borderRadius: 'var(--radius)',
                        background: 'var(--bg)',
                        border: error ? '1px solid var(--danger)' : '1px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        width: '100%',
                        ...style
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'}
                    {...props as InputHTMLAttributes<HTMLInputElement>}
                />
            )}
            {error && (
                <span id={errorId} style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</span>
            )}
            {helperText && !error && (
                <span id={helperId} style={{ fontSize: '12px', color: '#666' }}>{helperText}</span>
            )}
        </div>
    );
};

export default AdminInput;
