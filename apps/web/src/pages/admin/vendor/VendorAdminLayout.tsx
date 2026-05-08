import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../utils/api';

interface StaffMe {
    id?: string;
    staff_id?: string;
    vendor_admin_id?: string;
    name: string;
    username?: string;
    email?: string;
    role: string;
    auth_type?: 'VENDOR_ADMIN' | 'STAFF_ADMIN';
}

function staffRoleLabel(role: string): string {
    if (role === 'OWNER') return 'Owner';
    if (role === 'MANAGER') return 'Manager';
    if (role === 'ADMIN') return 'Manager';
    if (role === 'STAMPER') return 'Stamper';
    return role;
}

function staffInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const VendorAdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const { slug } = useParams<{ slug: string }>();
    const { logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [vendorName, setVendorName] = useState<string | null>(null);
    const [staffMe, setStaffMe] = useState<StaffMe | null>(null);

    useEffect(() => {
        // Fetch vendor name for display
        const fetchVendorName = async () => {
            if (!slug) return;
            try {
                // Use public endpoint to get trading name
                const res = await api.get(`/api/v1/v/${slug}/public`);
                if (res.data?.trading_name) {
                    setVendorName(res.data.trading_name);
                } else {
                    // Fallback to slug if trading name not available
                    setVendorName(slug);
                }
            } catch (error) {
                // Fallback to slug on error
                setVendorName(slug || 'Vendor');
            }
        };
        fetchVendorName();
    }, [slug]);

    useEffect(() => {
        let cancelled = false;
        const loadStaff = async () => {
            try {
                const res = await api.get<StaffMe>('/api/v1/vendor-admin/me');
                if (!cancelled) setStaffMe(res.data);
            } catch {
                if (!cancelled) setStaffMe(null);
            }
        };
        loadStaff();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const handleLogout = () => {
        const wasVendorAdmin = staffMe?.auth_type === 'VENDOR_ADMIN';
        logout();
        navigate(wasVendorAdmin ? '/vendor/admin/login' : `/v/${slug}/staff`);
    };

    const navItems = [
        { name: 'Dashboard', path: `/v/${slug}/admin/dashboard`, icon: '📊' },
        { name: 'Setup', path: `/v/${slug}/admin/onboarding`, icon: '✅' },
        { name: 'Members', path: `/v/${slug}/admin/members`, icon: '👥' },
        { name: 'Staff', path: `/v/${slug}/admin/staff`, icon: '🛡️' },
        { name: 'Program', path: `/v/${slug}/admin/program`, icon: '🎁' },
        { name: 'Branding', path: `/v/${slug}/admin/branding`, icon: '🎨' },
        { name: 'Settings', path: `/v/${slug}/admin/settings`, icon: '⚙️' },
    ];

    return (
        <div className="admin-layout">
            {/* Mobile Header */}
            <header className="admin-header md:hidden">
                <div className="logo">
                    <span className="brand-punch">Punch</span>
                    <span className="brand-card">Card</span>
                    {vendorName && <span className="vendor-name-mobile">{vendorName}</span>}
                </div>
                <div className="admin-header-user">
                    {staffMe && (
                        <>
                            <span className="admin-header-avatar" aria-hidden>{staffInitials(staffMe.name)}</span>
                            <span className="admin-header-name">{staffMe.name}</span>
                        </>
                    )}
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="menu-btn">
                    ☰
                </button>
            </header>

            {/* Sidebar */}
            <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <span className="brand-punch">Punch</span>
                    <span className="brand-card">Card</span>
                    <div className="text-xs text-muted mt-1">
                        {vendorName ? `${vendorName} Vendor Portal` : 'Vendor Portal'}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <span className="icon">{item.icon}</span>
                            <span className="label">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    {staffMe && (
                        <div className="sidebar-user-card">
                            <div className="sidebar-user-avatar" aria-hidden>{staffInitials(staffMe.name)}</div>
                            <div className="sidebar-user-text">
                                <div className="sidebar-user-name">{staffMe.name}</div>
                                <div className="sidebar-user-meta">
                                    {staffMe.username ? `@${staffMe.username}` : staffMe.email} · {staffRoleLabel(staffMe.role)}
                                </div>
                            </div>
                        </div>
                    )}
                    <button type="button" onClick={handleLogout} className="logout-btn">
                        🚪 Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                {staffMe && (
                    <div className="vendor-admin-session-bar" role="status">
                        <span className="vendor-admin-session-label">Signed in as</span>
                        <strong className="vendor-admin-session-name">{staffMe.name}</strong>
                        <span className="vendor-admin-session-sep">·</span>
                        <span className="vendor-admin-session-user">{staffMe.username ? `@${staffMe.username}` : staffMe.email}</span>
                        <span className="vendor-admin-session-badge">{staffRoleLabel(staffMe.role)}</span>
                    </div>
                )}
                <Outlet context={{ vendorName, vendorSlug: slug }} />
            </main>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            <style>{`
                .admin-layout {
                    display: flex;
                    min-height: 100vh;
                    background: var(--bg-dark);
                    color: var(--text-main);
                }

                .admin-sidebar {
                    width: 260px;
                    background: var(--bg-card);
                    border-right: var(--glass-border);
                    display: flex;
                    flex-direction: column;
                    position: fixed;
                    height: 100vh;
                    z-index: 50;
                    transition: transform 0.3s ease;
                }

                .sidebar-header {
                    padding: 2rem;
                    border-bottom: var(--glass-border);
                }

                .brand-punch { font-weight: 800; color: var(--text-main); font-size: 1.5rem; letter-spacing: -0.05em; }
                .brand-card { font-weight: 800; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.5rem; letter-spacing: -0.05em; margin-left: 2px; }
                .vendor-name-mobile { font-size: 0.75rem; color: var(--text-muted); margin-left: 8px; font-weight: 500; }

                .sidebar-nav {
                    padding: 1rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    text-decoration: none;
                    color: var(--text-muted);
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .nav-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-main);
                }

                .nav-item.active {
                    background: linear-gradient(90deg, rgba(236, 72, 153, 0.1), transparent);
                    color: var(--primary);
                    border-left: 3px solid var(--primary);
                }

                .sidebar-footer {
                    padding: 1rem;
                    border-top: var(--glass-border);
                }

                .logout-btn {
                    width: 100%;
                    padding: 0.75rem;
                    background: transparent;
                    border: 1px solid var(--glass-border);
                    color: var(--text-muted);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .logout-btn:hover {
                    background: rgba(255, 0, 0, 0.1);
                    color: #ff4444;
                    border-color: rgba(255, 0, 0, 0.2);
                }

                .admin-main {
                    flex: 1;
                    margin-left: 260px;
                    padding: 2rem;
                    width: calc(100% - 260px);
                }

                .admin-header {
                    display: none; /* Desktop */
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 60px;
                    background: var(--bg-card);
                    border-bottom: var(--glass-border);
                    z-index: 40;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                    padding: 0 1rem;
                    backdrop-filter: blur(10px);
                }

                .admin-header .logo {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .admin-header-user {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    max-width: 42vw;
                    flex-shrink: 0;
                }

                .admin-header-avatar {
                    width: 28px;
                    height: 28px;
                    border-radius: 999px;
                    background: linear-gradient(135deg, rgba(239,68,68,0.35), rgba(234,179,8,0.28));
                    color: #fff;
                    font-size: 0.65rem;
                    font-weight: 800;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }

                .admin-header-name {
                    font-size: 0.78rem;
                    font-weight: 700;
                    color: var(--text-main);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .sidebar-user-card {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    padding: 0.65rem 0.75rem;
                    margin-bottom: 0.65rem;
                    border-radius: 12px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.08);
                }

                .sidebar-user-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, rgba(239,68,68,0.35), rgba(234,179,8,0.28));
                    color: #fff;
                    font-size: 0.78rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .sidebar-user-text {
                    min-width: 0;
                }

                .sidebar-user-name {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: var(--text-main);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .sidebar-user-meta {
                    font-size: 0.72rem;
                    color: var(--text-dim);
                    margin-top: 0.12rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .vendor-admin-session-bar {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 0.35rem 0.5rem;
                    margin-bottom: 1.25rem;
                    padding: 0.65rem 1rem;
                    border-radius: 12px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    font-size: 0.875rem;
                    color: var(--text-muted);
                }

                .vendor-admin-session-label {
                    color: var(--text-dim);
                    font-weight: 500;
                    font-size: 0.8rem;
                }

                .vendor-admin-session-name {
                    color: var(--text-main);
                    font-weight: 700;
                }

                .vendor-admin-session-user {
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    font-size: 0.8rem;
                    color: var(--text-dim);
                }

                .vendor-admin-session-sep {
                    color: var(--text-dim);
                    opacity: 0.6;
                }

                .vendor-admin-session-badge {
                    margin-left: auto;
                    font-size: 0.68rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    padding: 0.28rem 0.55rem;
                    border-radius: 999px;
                    background: rgba(168, 85, 247, 0.18);
                    color: #e9d5ff;
                    border: 1px solid rgba(168, 85, 247, 0.35);
                }

                .menu-btn {
                    background: none;
                    border: none;
                    color: var(--text-main);
                    font-size: 1.5rem;
                    cursor: pointer;
                }

                @media (max-width: 768px) {
                    .admin-sidebar {
                        transform: translateX(-100%);
                    }
                    .admin-sidebar.open {
                        transform: translateX(0);
                    }
                    .admin-main {
                        margin-left: 0;
                        width: 100%;
                        padding-top: 80px; /* Header height + padding */
                    }
                    .admin-header {
                        display: flex;
                    }
                    .sidebar-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        z-index: 45;
                        backdrop-filter: blur(3px);
                    }
                }
            `}</style>
        </div>
    );
};

export default VendorAdminLayout;
