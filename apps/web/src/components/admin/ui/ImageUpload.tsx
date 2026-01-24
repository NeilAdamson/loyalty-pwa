
import React, { useRef, useState } from 'react';
import { api } from '../../../utils/api';

interface ImageUploadProps {
    label: string;
    value?: string;
    onChange: (url: string) => void;
    placeholder?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ label, value, onChange, placeholder }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = async (file: File) => {
        if (!file) return;

        // Validation (Image only, Max 5MB)
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('File size too large (Max 5MB)');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await api.post('/api/v1/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onChange(res.data.url);
        } catch (err) {
            console.error('Upload failed', err);
            alert('Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {label}
            </label>

            <div
                style={{
                    border: `1px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    background: dragActive ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
            >
                {/* Preview Thumbnail */}
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '6px',
                    background: value ? `url(${value}) center/contain no-repeat` : 'var(--surface)',
                    border: '1px solid var(--border)',
                    flexShrink: 0
                }} />

                <div style={{ flex: 1 }}>
                    {/* URL Input (Editable) */}
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder || "https://..."}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text)',
                            fontSize: '13px',
                            marginBottom: '4px',
                            outline: 'none'
                        }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {uploading ? 'Uploading...' : 'Paste URL or Upload Image'}
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    accept="image/*"
                />

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                        padding: '6px 12px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        cursor: 'pointer'
                    }}
                >
                    Upload
                </button>
            </div>
        </div>
    );
};

export default ImageUpload;
