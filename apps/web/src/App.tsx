import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import VendorLayout from './pages/VendorLayout';

import MemberAuth from './pages/MemberAuth';
import StaffAuth from './pages/StaffAuth';
import MemberCard from './pages/MemberCard';
import StaffDashboard from './pages/StaffDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminForgotPassword from './pages/admin/AdminForgotPassword';
import AdminResetPassword from './pages/admin/AdminResetPassword';

import LandingPage from './pages/LandingPage';

import VendorAdminLayout from './pages/admin/vendor/VendorAdminLayout';
import VendorDashboard from './pages/admin/vendor/VendorDashboard';
import VendorMembers from './pages/admin/vendor/VendorMembers';
import VendorStaff from './pages/admin/vendor/VendorStaff';
import VendorBranding from './pages/admin/vendor/VendorBranding';
import VendorSettings from './pages/admin/vendor/VendorSettings';
import VendorLookup from './pages/VendorLookup';

// Lazy-load admin backoffice routes so /admin/login loads quickly (no heavy vendor/user pages)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminVendorList = lazy(() => import('./pages/admin/AdminVendorList'));
const AdminVendorCreate = lazy(() => import('./pages/admin/AdminVendorCreate'));
const AdminVendorDetail = lazy(() => import('./pages/admin/AdminVendorDetail'));
const AdminVendorQr = lazy(() => import('./pages/admin/AdminVendorQr'));
const AdminUserList = lazy(() => import('./pages/admin/AdminUserList'));
const AdminUserCreate = lazy(() => import('./pages/admin/AdminUserCreate'));
const AdminUserEdit = lazy(() => import('./pages/admin/AdminUserEdit'));
const AdminMemberList = lazy(() => import('./pages/admin/AdminMemberList'));


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
        path: "/admin/forgot-password",
        element: <AdminForgotPassword />,
    },
    {
        path: "/admin/reset-password",
        element: <AdminResetPassword />,
    },
    {
        path: "/admin",
        element: (
            <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading...</div>}>
                <AdminLayout />
            </Suspense>
        ),
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
