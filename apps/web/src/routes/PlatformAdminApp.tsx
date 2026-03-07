import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from '../pages/admin/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminVendorList from '../pages/admin/AdminVendorList';
import AdminVendorCreate from '../pages/admin/AdminVendorCreate';
import AdminVendorQr from '../pages/admin/AdminVendorQr';
import AdminMemberList from '../pages/admin/AdminMemberList';
import AdminUserList from '../pages/admin/AdminUserList';
import AdminUserCreate from '../pages/admin/AdminUserCreate';
import AdminUserEdit from '../pages/admin/AdminUserEdit';
import { startPerf } from '../utils/perf';

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

const AdminVendorDetail = lazyWithTiming('AdminVendorDetail', () => import('../pages/admin/AdminVendorDetail'));

const routeFallback = (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading...
    </div>
);

export default function PlatformAdminApp() {
    return (
        <Routes>
            <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="vendors" element={<AdminVendorList />} />
                <Route path="vendors/new" element={<AdminVendorCreate />} />
                <Route
                    path="vendors/:id"
                    element={
                        <Suspense fallback={routeFallback}>
                            <AdminVendorDetail />
                        </Suspense>
                    }
                />
                <Route path="vendors/:id/qr" element={<AdminVendorQr />} />
                <Route path="members" element={<AdminMemberList />} />
                <Route path="users" element={<AdminUserList />} />
                <Route path="users/new" element={<AdminUserCreate />} />
                <Route path="users/:id/edit" element={<AdminUserEdit />} />
                <Route path="settings" element={<div>Settings</div>} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
        </Routes>
    );
}
