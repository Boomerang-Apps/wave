import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '@/components/Loading';

interface IProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: IProtectedRouteProps): React.JSX.Element {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
