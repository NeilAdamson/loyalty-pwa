import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './signupQrPoster.css';

export type SignupQrPosterBranding = {
    logo_url?: string | null;
    wordmark_url?: string | null;
    welcome_text?: string | null;
    primary_color?: string;
    accent_color?: string;
};

export type SignupQrPosterProgram = {
    stamps_required: number;
    reward_title: string;
    reward_description: string;
    terms_text?: string;
};

export type SignupQrPosterProps = {
    tradingName: string;
    signupUrl: string;
    branchName?: string | null;
    branding?: SignupQrPosterBranding | null;
    program?: SignupQrPosterProgram | null;
};

const SignupQrPoster = forwardRef<HTMLDivElement, SignupQrPosterProps>(function SignupQrPoster(
    { tradingName, signupUrl, branchName, branding, program },
    ref
) {
    const primary = branding?.primary_color || '#111827';
    const accent = branding?.accent_color || primary;
    const headline = branding?.welcome_text?.trim() || 'Join our loyalty program';
    const logoUrl = branding?.wordmark_url || branding?.logo_url;
    const stampsRequired = program?.stamps_required ?? 10;
    const rewardTitle = program?.reward_title ?? 'a free reward';
    const rewardDescription = program?.reward_description ?? '';
    const terms = program?.terms_text?.trim();

    return (
        <div
            ref={ref}
            className="signup-qr-poster"
            style={{
                ['--poster-primary' as string]: primary,
                ['--poster-accent' as string]: accent,
            }}
        >
            <div className="signup-qr-poster__brand">
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt={tradingName}
                        className="signup-qr-poster__logo"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <h1 className="signup-qr-poster__title">{tradingName}</h1>
                )}
            </div>

            {!logoUrl ? null : <h2 className="signup-qr-poster__title">{tradingName}</h2>}

            <p className="signup-qr-poster__headline">{headline}</p>
            <p className="signup-qr-poster__program">
                Collect {stampsRequired} stamps &rarr; {rewardTitle}
            </p>
            {rewardDescription ? (
                <p className="signup-qr-poster__reward">{rewardDescription}</p>
            ) : null}

            {branchName ? <p className="signup-qr-poster__branch">{branchName}</p> : null}

            <div className="signup-qr-poster__qr-wrap">
                <QRCodeSVG value={signupUrl} size={220} fgColor={primary} level="M" />
            </div>

            <p className="signup-qr-poster__cta">Scan with your phone</p>
            <p className="signup-qr-poster__hint">No app needed — join in seconds</p>

            {terms ? <p className="signup-qr-poster__terms">{terms}</p> : null}

            <div className="signup-qr-poster__footer">Powered by PunchCard</div>
        </div>
    );
});

export default SignupQrPoster;
