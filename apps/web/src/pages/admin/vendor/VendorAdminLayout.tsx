import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../../context/AuthContext';

const VendorAdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const { slug } = useParams<{ slug: string }>();
    const { logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate(`/v/${slug}/staff`); // Redirect to staff login
    };

    const navItems = [
        { name: 'Dashboard', path: `/v/${slug}/admin/dashboard`, icon: '📊' },
        { name: 'Members', path: `/v/${slug}/admin/members`, icon: '👥' },
        { name: 'Staff', path: `/v/${slug}/admin/staff`, icon: '🛡️' },
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
                    <div className="text-xs text-muted mt-1">Vendor Portal</div>
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
                    <button onClick={handleLogout} className="logout-btn">
                        🚪 Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <Outlet />
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
                    padding: 0 1rem;
                    backdrop-filter: blur(10px);
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
