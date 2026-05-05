import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: ReactNode;
  requireHost?: boolean;
  requireChecker?: boolean;
}

export function RequireAuth({ children, requireHost, requireChecker }: Props) {
  const { user, loading, isHost, isChecker } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  if (requireHost && !isHost) {
    return <Navigate to="/host/register" replace />;
  }

  if (requireChecker && !isChecker) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}