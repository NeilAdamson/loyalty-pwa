import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/api';

const LandingPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [vendor, setVendor] = useState<any>(null);

    useEffect(() => {
        api.get(`/v/${slug}/public`).then(r => setVendor(r.data)).catch(console.error);
    }, [slug]);

    if (!vendor) return <div>Loading...</div>;

    return (
        <div className="landing-page">
            <h1>Welcome to {vendor.trading_name}</h1>
            <div className="actions">
                <h2>Members</h2>
                <Link to={`/v/${slug}/auth/member`} className="btn">Member Login</Link>
                <hr />
                <h2>Staff</h2>
                <Link to={`/v/${slug}/auth/staff`} className="btn">Staff Login</Link>
            </div>
        </div>
    );
};

export default LandingPage;
