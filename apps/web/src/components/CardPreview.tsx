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

    // Background Logic - Enhanced
    const getBackground = () => {
        if (cardStyle === 'GRADIENT') {
            return `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
        }
        return `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`; // Subtle gradient for solid
    };

    const stampsRequired = program?.stamps_required || 10;
    const rewardTitle = program?.reward_title || 'Reward Progress';

    return (
        <div style={{
            background: getBackground(),
            color: textColor,
            padding: '24px',
            borderRadius: '24px',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '240px',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '380px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            {/* Shimmer/Noise Overlay */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 60%)',
                pointerEvents: 'none'
            }} />

            {branding.logo_url ? (
                <img
                    src={branding.logo_url}
                    alt="Logo"
                    style={{
                        height: '48px',
                        width: 'auto',
                        objectFit: 'contain',
                        alignSelf: 'center',
                        marginBottom: 'auto',
                        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))',
                        zIndex: 2
                    }}
                />
            ) : (
                <div style={{ marginBottom: 'auto' }} /> // Spacer
            )}

            <div style={{ marginTop: '24px', zIndex: 2 }}>
                <h3 style={{
                    margin: '0 0 20px 0',
                    fontSize: '1rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    opacity: 0.9,
                    color: textColor,
                    textAlign: 'center'
                }}>
                    {rewardTitle}
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '12px',
                    justifyItems: 'center'
                }}>
                    {Array.from({ length: stampsRequired }).map((_, i) => (
                        <div key={i} style={{
                            width: '100%',
                            aspectRatio: '1',
                            borderRadius: '50%',
                            background: i < stampsCount
                                ? `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
                                : 'rgba(0,0,0,0.1)',
                            border: i < stampsCount
                                ? `2px solid rgba(255,255,255,0.8)`
                                : `2px dashed ${textColor}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: i < stampsCount ? getContrastColor(accentColor) : 'transparent',
                            fontSize: '16px',
                            boxShadow: i < stampsCount
                                ? `0 4px 12px ${accentColor}66, inset 0 2px 4px rgba(255,255,255,0.3)`
                                : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: i < stampsCount ? 'scale(1)' : 'scale(0.95)'
                        }}>
                            {i < stampsCount && (
                                <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{
                    marginTop: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: `1px solid ${textColor}20`,
                    paddingTop: '12px'
                }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6, letterSpacing: '0.05em' }}>MEMBER CARD</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9 }}>
                        {stampsCount} / {stampsRequired}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CardPreview;
