import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import VendorLayout from '../pages/VendorLayout';
import MemberAuth from '../pages/MemberAuth';
import StaffAuth from '../pages/StaffAuth';
import { loadStaffDashboard } from './routeLoaders';
import { startPerf } from '../utils/perf';
import { ProtectedRoute } from '../shared/ProtectedRoute';
import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';

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

const StaffDashboard = lazyWithTiming('StaffDashboard', loadStaffDashboard);

const routeFallback = (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading...
    </div>
);

function VendorIndexRedirect() {
    const location = useLocation();
    return <Navigate to={`login${location.search}`} replace />;
}

export default function VendorPublicApp() {
    return (
        <Routes>
            <Route element={<VendorLayout />}>
                <Route index element={<VendorIndexRedirect />} />
                <Route path="login" element={<MemberAuth />} />
                <Route path="staff" element={<StaffAuth />} />
                <Route
                    path="staff/scan"
                    element={
                        <Suspense fallback={routeFallback}>
                            <ProtectedRoute allowedRoles={['STAFF', 'STAMPER', 'ADMIN']}>
                                <StaffDashboard />
                            </ProtectedRoute>
                        </Suspense>
                    }
                />
            </Route>
        </Routes>
    );
}
