import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminLogin from './pages/admin/AdminLogin';
import AdminForgotPassword from './pages/admin/AdminForgotPassword';
import AdminResetPassword from './pages/admin/AdminResetPassword';
import LandingPage from './pages/LandingPage';
import VendorLookup from './pages/VendorLookup';
import { perfLog, startPerf } from './utils/perf';
import { loadMemberCard, loadPlatformAdminApp, loadVendorAdminApp, loadVendorPublicApp } from './routes/routeLoaders';
import { ProtectedRoute } from './shared/ProtectedRoute';

function lazyWithTiming<T extends ComponentType<Record<string, never>>>(
    label: string,
    loader: () => Promise<{ default: T }>
) {
    return lazy(async () => {
        const finishImport = startPerf('chunk', `import ${label}`);
        const mod = await loader();
        finishImport();
        return mod;
    });
}

const VendorPublicApp = lazyWithTiming('VendorPublicApp', loadVendorPublicApp);
const VendorAdminApp = lazyWithTiming('VendorAdminApp', loadVendorAdminApp);
const PlatformAdminApp = lazyWithTiming('PlatformAdminApp', loadPlatformAdminApp);
const MemberCard = lazyWithTiming('MemberCard', loadMemberCard);

const routeFallback = (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading...
    </div>
);

function withSuspense(element: JSX.Element) {
    return <Suspense fallback={routeFallback}>{element}</Suspense>;
}

const router = createBrowserRouter([
    {
        path: "/",
        element: withSuspense(<LandingPage />),
    },
    {
        path: "/v/:slug/*",
        element: withSuspense(<VendorPublicApp />),
    },
    {
        path: "/v/:slug/admin/*",
        element: withSuspense(
            <ProtectedRoute allowedRoles={['ADMIN']}>
                <VendorAdminApp />
            </ProtectedRoute>
        ),
    },
    {
        path: "/me/card",
        element: withSuspense(
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
        element: withSuspense(<AdminForgotPassword />),
    },
    {
        path: "/admin/reset-password",
        element: withSuspense(<AdminResetPassword />),
    },
    {
        path: "/admin/*",
        element: withSuspense(<PlatformAdminApp />),
    },
    {
        path: "*",
        element: <div>404 Not Found</div>,
    },
]);

function App() {
    perfLog('bootstrap', 'App rendered');
    return (
        <AdminAuthProvider>
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </AdminAuthProvider>
    );
}

export default App;
