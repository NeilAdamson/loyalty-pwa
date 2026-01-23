import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { api } from '../utils/api';

const VendorLayout: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();

    useEffect(() => {
        // 1. Fetch Vendor Branding Publicly
        api.get(`/v/${slug}/public`)
            .then(res => {
                const { branding, trading_name } = res.data;
                // 2. Set CSS Variables for Theme
                const root = document.documentElement;
                root.style.setProperty('--primary-color', branding.primary_color);
                root.style.setProperty('--secondary-color', branding.secondary_color);
                // root.style.setProperty('--font-family', ...); // If needed
                document.title = trading_name;
            })
            .catch(err => {
                console.error("Failed to load vendor", err);
                // Handle 404 - e.g. Redirect to generic error page
            });
    }, [slug]);

    return (
        <div className="vendor-app">
            <header style={{ backgroundColor: 'var(--primary-color)', color: '#fff', padding: '1rem' }}>
                {/* Logo or Title could specific here or in sub-pages */}
                <div className="container">Vendor App</div>
            </header>
            <main className="container" style={{ padding: '1rem' }}>
                <Outlet />
            </main>
            {/* Simple Global CSS for variables would be in index.css */}
        </div>
    );
};

export default VendorLayout;
