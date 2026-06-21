import React, { useState } from 'react';

type MemberRewardDetailsProps = {
    rewardDescription?: string;
    termsText?: string;
};

const MemberRewardDetails: React.FC<MemberRewardDetailsProps> = ({
    rewardDescription,
    termsText,
}) => {
    const [termsOpen, setTermsOpen] = useState(false);
    const description = rewardDescription?.trim();
    const terms = termsText?.trim();

    if (!description && !terms) return null;

    return (
        <div
            className="glass-panel"
            style={{
                width: '100%',
                maxWidth: '380px',
                padding: '16px 20px',
                borderRadius: '20px',
                marginBottom: '16px',
                zIndex: 10,
            }}
        >
            {description ? (
                <div style={{ marginBottom: terms ? '12px' : 0 }}>
                    <p
                        style={{
                            margin: '0 0 6px 0',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            opacity: 0.65,
                        }}
                    >
                        Reward details
                    </p>
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, opacity: 0.95 }}>
                        {description}
                    </p>
                </div>
            ) : null}

            {terms ? (
                <div>
                    <button
                        type="button"
                        onClick={() => setTermsOpen((open) => !open)}
                        aria-expanded={termsOpen}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'underline',
                            opacity: 0.85,
                        }}
                    >
                        {termsOpen ? 'Hide terms' : 'View terms & conditions'}
                    </button>
                    {termsOpen ? (
                        <p
                            style={{
                                margin: '10px 0 0 0',
                                fontSize: '0.82rem',
                                lineHeight: 1.55,
                                opacity: 0.75,
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {terms}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

export default MemberRewardDetails;
