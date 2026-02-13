import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
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
import VendorBranding from './pages/admin/vendor/VendorBranding';
import VendorSettings from './pages/admin/vendor/VendorSettings';
import VendorLookup from './pages/VendorLookup';


const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
    const { token, user, isLoading } = useAuth();
    if (isLoading) return <div>Loading...</div>;
    if (!token || !user) return <Navigate to="/" />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <div>Unauthorized</div>;
    return children;
};

const router = createBrowserRouter([
    {
        path: "/",
        element: <LandingPage />,
    },
    {
        path: "/v/:slug",
        element: <VendorLayout />,
        children: [
            { index: true, element: <Navigate to="login" replace /> },
            { path: "login", element: <MemberAuth /> },
            { path: "staff", element: <StaffAuth /> },
            {
                path: "staff/scan",
                element: (
                    <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
                        <StaffDashboard />
                    </ProtectedRoute>
                ),
            },
        ],
    },
    {
        path: "/v/:slug/admin",
        element: (
            <ProtectedRoute allowedRoles={['ADMIN']}>
                <VendorAdminLayout />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: "dashboard", element: <VendorDashboard /> },
            { path: "members", element: <VendorMembers /> },
            { path: "staff", element: <VendorStaff /> },
            { path: "branding", element: <VendorBranding /> },
            { path: "settings", element: <VendorSettings /> },
        ],
    },
    {
        path: "/me/card",
        element: (
            <ProtectedRoute allowedRoles={['MEMBER']}>
                <MemberCard />
            </ProtectedRoute>
        ),
    },
    {
        path: "/staff",
        element: <Navigate to="/" replace />,
    },
    {
        path: "/vendor/login",
        element: <VendorLookup />,
    },
    {
        path: "/admin/login",
        element: <AdminLogin />,
    },
    {
        path: "/admin",
        element: <AdminLayout />,
        children: [
            { index: true, element: <AdminDashboard /> },
            { path: "vendors", element: <AdminVendorList /> },
            { path: "vendors/new", element: <AdminVendorCreate /> },
            { path: "vendors/:id", element: <AdminVendorDetail /> },
            { path: "vendors/:id/qr", element: <AdminVendorQr /> },
            { path: "members", element: <AdminMemberList /> },
            { path: "users", element: <AdminUserList /> },
            { path: "users/new", element: <AdminUserCreate /> },
            { path: "users/:id/edit", element: <AdminUserEdit /> },
            { path: "settings", element: <div>Settings</div> },
        ],
    },
    {
        path: "*",
        element: <div>404 Not Found</div>,
    },
]);

function App() {
    return (
        <AdminAuthProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </AdminAuthProvider>
    );
}

export default App;
