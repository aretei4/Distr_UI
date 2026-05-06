import React from "react";
import { Navigate } from "react-router-dom";
import { authService, AuthUser } from "../services/authService";

interface PrivateRouteProps {
  children: React.ReactNode;
  roles?: AuthUser["role"][];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles }) => {
  const user = authService.getUser();

  if (!user) return <Navigate to="/" replace />;

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    // Authenticated but wrong role — redirect to dashboard instead of login
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
