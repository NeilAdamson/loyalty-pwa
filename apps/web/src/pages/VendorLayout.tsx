import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { api } from '../utils/api';
import { getContrastColor } from '../utils/color';

const VendorLayout: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [vendorData, setVendorData] = React.useState<any>(null);

    useEffect(() => {
        if (!slug) return;

        // 1. Fetch Vendor Branding Publicly
        api.get(`/api/v1/v/${slug}/public`)
            .then(res => {
                const { branding, trading_name } = res.data;
                setVendorData(res.data);

                if (branding) {
                    // 2. Set CSS Variables for Theme
                    const root = document.documentElement;
                    const primary = branding.primary_color || '#000000';
                    const secondary = branding.secondary_color || '#ffffff';
                    const accent = branding.accent_color || branding.primary_color;
                    const background = branding.background_color || '#18181b';

                    root.style.setProperty('--primary', primary);
                    root.style.setProperty('--primary-color', primary);
                    root.style.setProperty('--primary-hover', primary);
                    root.style.setProperty('--secondary-color', secondary);

                    // Contrast
                    root.style.setProperty('--primary-contrast', getContrastColor(primary));
                    root.style.setProperty('--accent-contrast', getContrastColor(accent));

                    // New Branding Fields
                    root.style.setProperty('--vendor-accent', accent);
                    root.style.setProperty('--vendor-background', background);

                    // If background color is set, apply it to body or shell?
                    // Ideally we apply it to a class or body.
                    // For now, let's set it as a variable that AuthShell/CardPage uses.
                }

                document.title = trading_name;
            })
            .catch(err => {
                console.error("Failed to load vendor", err);
            });
    }, [slug]);

    return (
        <div className="vendor-app" style={{ minHeight: '100vh', background: 'var(--vendor-background, #18181b)' }}>
            <Outlet context={{ vendor: vendorData }} />
        </div>
    );
};

export default VendorLayout;
