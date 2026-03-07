import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles?: string[] }) {
    const { token, user, isLoading } = useAuth();

    if (isLoading) return <div>Loading...</div>;
    if (!token || !user) return <Navigate to="/" />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <div>Unauthorized</div>;

    return children;
}
