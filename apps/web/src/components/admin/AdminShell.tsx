import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/useAdminAuth';
import { beginRouteTransition, completeRouteTransition, perfLog } from '../../utils/perf';

// Simple Icons
const Icons = {
    Home: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
    Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    Briefcase: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
    UserPlus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>,
    Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
    LogOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
    Shield: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
    Alert: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
};

const AdminShell: React.FC = () => {
    const { admin, logout, isLoading } = useAdminAuth();
    const navigate = useNavigate();
    const location = useLocation();

    React.useEffect(() => {
        if (!isLoading && !admin) {
            perfLog('admin-shell', 'redirecting to login because no admin session');
            navigate('/admin/login');
        }
    }, [isLoading, admin, navigate]);

    React.useEffect(() => {
        if (!isLoading) {
            completeRouteTransition(location.pathname, {
                authenticated: Boolean(admin)
            });
        }
    }, [location.pathname, isLoading, admin]);

    React.useEffect(() => {
        perfLog('admin-shell', 'auth gate state changed', {
            pathname: location.pathname,
            isLoading,
            authenticated: Boolean(admin)
        });
    }, [location.pathname, isLoading, admin]);

    if (isLoading) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading...</div>;

    const handleLogout = async () => {
        await logout();
        navigate('/admin/login');
    };

    const navItems = [
        { label: 'Overview', path: '/admin', end: true, icon: <Icons.Home /> },
        { label: 'Vendors', path: '/admin/vendors', icon: <Icons.Briefcase /> },
        { label: 'Members', path: '/admin/members', icon: <Icons.Users /> },
        { label: 'Fraud flags', path: '/admin/fraud', icon: <Icons.Alert /> },
        { label: 'Admin Users', path: '/admin/users', icon: <Icons.Shield /> },
        { label: 'Settings', path: '/admin/settings', icon: <Icons.Settings /> },
    ];

    return (
        <div className="adminShell">
            {/* Desktop Sidebar — hidden on mobile via CSS */}
            <aside className="adminSidebar">
                {/* Brand */}
                <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'var(--primary)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <Icons.Shield />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Loyalty Admin</h2>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Platform Backoffice</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            onClick={() => beginRouteTransition(item.path, location.pathname)}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius)',
                                textDecoration: 'none',
                                color: isActive ? 'var(--text)' : 'var(--text-secondary)',
                                background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                                fontWeight: isActive ? 500 : 400,
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            })}
                        >
                            <span style={{ opacity: 0.8 }}>{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User Profile / Logout */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--surface-hover)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            fontSize: '14px',
                            fontWeight: 600
                        }}>
                            {admin?.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{admin?.name || 'Admin'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {admin?.email || 'Super Admin'}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            fontSize: '13px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <Icons.LogOut />
                        <span>Sign Out</span>
                    </button>

                </div>
            </aside>

            {/* ── Mobile Top Header ── */}
            <header className="adminMobileHeader" aria-label="Admin navigation">
                <div className="adminMobileHeaderBrand">
                    <div className="adminMobileHeaderBrandIcon">
                        <Icons.Shield />
                    </div>
                    <span className="adminMobileHeaderTitle">Loyalty Admin</span>
                </div>
                <div className="adminMobileHeaderUser">
                    <div className="adminMobileHeaderAvatar" aria-hidden>
                        {admin?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <button
                        className="adminMobileHeaderLogout"
                        onClick={handleLogout}
                        aria-label="Sign out"
                    >
                        <Icons.LogOut />
                        <span>Sign Out</span>
                    </button>
                </div>
            </header>

            {/* ── Bottom Tab Bar (mobile only) ── */}
            <nav className="adminBottomBar" aria-label="Main navigation">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) => `bottomTab${isActive ? ' active' : ''}`}
                        onClick={() => beginRouteTransition(item.path, location.pathname)}
                    >
                        {item.icon}
                        <span>{item.label === 'Admin Users' ? 'Admins' : item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Main Content */}
            <main className="adminContent">
                <div className="adminContentInner" style={{ maxWidth: '95%', margin: '0 auto', padding: '0 20px' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminShell;
