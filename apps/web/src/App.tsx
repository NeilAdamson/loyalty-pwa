import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import VendorLayout from './pages/VendorLayout';

import MemberAuth from './pages/MemberAuth';
import StaffAuth from './pages/StaffAuth';
import MemberCard from './pages/MemberCard';
import StaffDashboard from './pages/StaffDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminVendorList from './pages/admin/AdminVendorList';
import AdminVendorCreate from './pages/admin/AdminVendorCreate';
import AdminUserList from './pages/admin/AdminUserList';
import AdminUserCreate from './pages/admin/AdminUserCreate';
import AdminUserEdit from './pages/admin/AdminUserEdit';
import AdminMemberList from './pages/admin/AdminMemberList';
import AdminVendorQr from './pages/admin/AdminVendorQr';
import AdminVendorDetail from './pages/admin/AdminVendorDetail';

import AdminDashboard from './pages/admin/AdminDashboard';
import LandingPage from './pages/LandingPage';

import VendorAdminLayout from './pages/admin/vendor/VendorAdminLayout';
import VendorDashboard from './pages/admin/vendor/VendorDashboard';
import VendorMembers from './pages/admin/vendor/VendorMembers';
import VendorStaff from './pages/admin/vendor/VendorStaff';
import VendorSettings from './pages/admin/vendor/VendorSettings';
import VendorLookup from './pages/VendorLookup';


const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
    const { token, user, isLoading } = useAuth();
    if (isLoading) return <div>Loading...</div>;
    if (!token || !user) return <Navigate to="/" />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <div>Unauthorized</div>;
    return children;
};

function App() {
    return (
        <AdminAuthProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        {/* Vendor Scoped Routes */}
                        <Route path="/v/:slug" element={<VendorLayout />}>
                            <Route index element={<Navigate to="login" replace />} />
                            <Route path="login" element={<MemberAuth />} />
                            <Route path="staff" element={<StaffAuth />} />
                            <Route path="staff/scan" element={
                                <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
                                    <StaffDashboard />
                                </ProtectedRoute>
                            } />
                        </Route>

                        {/* Vendor Admin Routes */}
                        <Route path="/v/:slug/admin" element={
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <VendorAdminLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<VendorDashboard />} />
                            <Route path="members" element={<VendorMembers />} />
                            <Route path="staff" element={<VendorStaff />} />
                            <Route path="settings" element={<VendorSettings />} />
                        </Route>

                        {/* Protected Routes */}
                        <Route path="/me/card" element={
                            <ProtectedRoute allowedRoles={['MEMBER']}>
                                <MemberCard />
                            </ProtectedRoute>
                        } />
                        <Route path="/staff" element={<Navigate to="/" replace />} />

                        {/* Generic Routes */}
                        <Route path="/vendor/login" element={<VendorLookup />} />

                        {/* Admin Routes */}
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="vendors" element={<AdminVendorList />} />
                            <Route path="vendors/new" element={<AdminVendorCreate />} />
                            <Route path="vendors/:id" element={<AdminVendorDetail />} />
                            <Route path="vendors/:id/qr" element={<AdminVendorQr />} />
                            <Route path="members" element={<AdminMemberList />} />
                            <Route path="users" element={<AdminUserList />} />
                            <Route path="users/new" element={<AdminUserCreate />} />
                            <Route path="users/:id/edit" element={<AdminUserEdit />} />
                            <Route path="settings" element={<div>Settings</div>} />
                        </Route>

                        <Route path="*" element={<div>404 Not Found</div>} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </AdminAuthProvider>
    );
}

export default App;
