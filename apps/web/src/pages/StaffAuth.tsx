import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StaffAuth: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { login } = useAuth();

    const [staffId, setStaffId] = useState(''); // In real app, might select from dropdown or type name? using ID for now as per verifying script
    // Actually, typical flow: select name -> enter PIN. 
    // For MVP: let's ask for "Staff ID (UUID)" because we don't have a "List Staff" public endpoint yet. 
    // WAIT: M2 "Get Public Profile" does NOT list staff. 
    // Staff need to know their ID? That's bad UX.
    // Re-reading API.md: "Staff Login: { staff_id, pin }".
    // OK for MVP, but maybe we should allow login by "Name + PIN" if unique? 
    // Or just input Staff ID. I'll stick to Staff ID for strictly following API for now.

    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post(`/v/${slug}/auth/staff/login`, { staff_id: staffId, pin });
            login(res.data.token);
            navigate('/staff');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login Failed');
        }
    };

    return (
        <div className="auth-container">
            <h2>Staff Login</h2>
            {error && <div className="error">{error}</div>}
            <form onSubmit={handleLogin}>
                <label>Staff ID (UUID)</label>
                <input
                    type="text"
                    value={staffId}
                    onChange={e => setStaffId(e.target.value)}
                    required
                />
                <label>PIN</label>
                <input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="****"
                    required
                />
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default StaffAuth;
