import React from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const AdminLayout: React.FC = () => {
    const { admin, isLoading, logout } = useAdminAuth();

    if (isLoading) return <div>Loading...</div>;
    if (!admin) return <Navigate to="/admin/login" />;

    return (
        <div style={{ display: 'flex', height: '100vh' }}>
            {/* Sidebar */}
            <aside style={{ width: '250px', background: '#333', color: 'white', padding: '20px' }}>
                <h3>Backoffice</h3>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <NavLink to="/admin" end style={({ isActive }) => ({ color: isActive ? 'cyan' : 'white', textDecoration: 'none' })}>
                        Dashboard
                    </NavLink>
                    <NavLink to="/admin/vendors" style={({ isActive }) => ({ color: isActive ? 'cyan' : 'white', textDecoration: 'none' })}>
                        Vendors
                    </NavLink>
                    <NavLink to="/admin/members" style={({ isActive }) => ({ color: isActive ? 'cyan' : 'white', textDecoration: 'none' })}>
                        Members
                    </NavLink>
                    <NavLink to="/admin/settings" style={({ isActive }) => ({ color: isActive ? 'cyan' : 'white', textDecoration: 'none' })}>
                        Settings
                    </NavLink>
                </nav>
                <button onClick={logout} style={{ marginTop: 'auto', width: '100%' }}>Logout</button>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                <header style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                    <span>Welcome, {admin.name}</span>
                </header>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
