import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import VendorLayout from './pages/VendorLayout';
import LandingPage from './pages/LandingPage';
import MemberAuth from './pages/MemberAuth';
import StaffAuth from './pages/StaffAuth';
import MemberCard from './pages/MemberCard';
import StaffDashboard from './pages/StaffDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminVendorList from './pages/admin/AdminVendorList';
import AdminVendorCreate from './pages/admin/AdminVendorCreate';

// Placeholder Admin Screens - We will create real ones next
const AdminDashboard = () => <div>Dashboard Overview</div>;
const AdminMemberList = () => <div>Member List</div>;

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
                        {/* Vendor Scoped Routes */}
                        <Route path="/v/:slug" element={<VendorLayout />}>
                            <Route index element={<LandingPage />} />
                            <Route path="auth/member" element={<MemberAuth />} />
                            <Route path="auth/staff" element={<StaffAuth />} />
                        </Route>

                        {/* Protected Routes */}
                        <Route path="/me/card" element={
                            <ProtectedRoute allowedRoles={['MEMBER']}>
                                <MemberCard />
                            </ProtectedRoute>
                        } />
                        <Route path="/staff" element={
                            <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
                                <StaffDashboard />
                            </ProtectedRoute>
                        } />

                        {/* Admin Routes */}
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="vendors" element={<AdminVendorList />} />
                            <Route path="vendors/new" element={<AdminVendorCreate />} />
                            <Route path="members" element={<AdminMemberList />} />
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
