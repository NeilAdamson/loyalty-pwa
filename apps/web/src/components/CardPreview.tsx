import React from 'react';
import { getContrastColor } from '../utils/color';

interface CardPreviewProps {
    branding: {
        primary_color?: string;
        secondary_color?: string;
        accent_color?: string;
        card_text_color?: string;
        card_style?: string;
        logo_url?: string;
    };
    program?: {
        stamps_required: number;
        reward_title: string;
    };
    stampsCount?: number;
}

const CardPreview: React.FC<CardPreviewProps> = ({ branding, program, stampsCount = 0 }) => {
    const primaryColor = branding.primary_color || '#000000';
    const secondaryColor = branding.secondary_color || '#ffffff';
    const accentColor = branding.accent_color || '#ffffff';
    const textColor = branding.card_text_color || '#ffffff';
    const cardStyle = branding.card_style || 'SOLID';

    // Background Logic
    const getBackground = () => {
        if (cardStyle === 'GRADIENT') return `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;
        return primaryColor;
    };

    const stampsRequired = program?.stamps_required || 10;
    const rewardTitle = program?.reward_title || 'Reward Progress';

    return (
        <div style={{
            background: getBackground(),
            color: textColor,
            padding: '24px',
            borderRadius: '20px',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '220px',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '380px' // Reasonable max width for preview
        }}>
            {branding.logo_url && (
                <img
                    src={branding.logo_url}
                    alt="Logo"
                    style={{
                        maxHeight: '70px',
                        maxWidth: '100%',
                        objectFit: 'contain',
                        alignSelf: 'center',
                        marginBottom: 'auto',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}
                />
            )}

            <div style={{ marginTop: branding.logo_url ? '20px' : 'auto' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', opacity: 0.9, color: textColor }}>
                    {rewardTitle}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {Array.from({ length: stampsRequired }).map((_, i) => (
                        <div key={i} style={{
                            aspectRatio: '1',
                            borderRadius: '50%',
                            background: i < stampsCount ? accentColor : 'rgba(255,255,255,0.1)',
                            border: i < stampsCount ? 'none' : `2px solid ${textColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            color: getContrastColor(accentColor), // Use utility for contrast on stamps
                            fontSize: '14px',
                            boxShadow: i < stampsCount ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                            opacity: i < stampsCount ? 1 : 0.6
                        }}>
                            {i < stampsCount && '✓'}
                        </div>
                    ))}
                </div>
                <p style={{ marginTop: '12px', fontSize: '0.9rem', opacity: 0.7, textAlign: 'right' }}>
                    {stampsCount} / {stampsRequired}
                </p>
            </div>
        </div>
    );
};

export default CardPreview;
