import { Navigate, Route, Routes } from 'react-router-dom';
import VendorAdminLayout from '../pages/admin/vendor/VendorAdminLayout';
import VendorDashboard from '../pages/admin/vendor/VendorDashboard';
import VendorMembers from '../pages/admin/vendor/VendorMembers';
import VendorStaff from '../pages/admin/vendor/VendorStaff';
import VendorBranding from '../pages/admin/vendor/VendorBranding';
import VendorProgram from '../pages/admin/vendor/VendorProgram';
import VendorSettings from '../pages/admin/vendor/VendorSettings';
import VendorOnboarding from '../pages/admin/vendor/VendorOnboarding';

export default function VendorAdminApp() {
    return (
        <Routes>
            <Route element={<VendorAdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="onboarding" element={<VendorOnboarding />} />
                <Route path="dashboard" element={<VendorDashboard />} />
                <Route path="members" element={<VendorMembers />} />
                <Route path="staff" element={<VendorStaff />} />
                <Route path="program" element={<VendorProgram />} />
                <Route path="branding" element={<VendorBranding />} />
                <Route path="settings" element={<VendorSettings />} />
            </Route>
        </Routes>
    );
}
