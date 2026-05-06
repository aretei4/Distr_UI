import React from "react";
import { Navigate } from "react-router-dom";
import { authService, AuthUser } from "../services/authService";

interface PrivateRouteProps {
  children: React.ReactNode;
  roles?: AuthUser["role"][];
}

/**
 * Used in two ways:
 *
 * 1. Layout guard — wraps <MainLayout /> so the entire layout tree is protected:
 *      <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
 *
 * 2. Role guard — protects a single page inside the layout:
 *      <Route path="/template" element={<PrivateRoute roles={["ADMIN"]}><Template /></PrivateRoute>} />
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles }) => {
  const user = authService.getUser();

  // Not logged in → login page
  if (!user) return <Navigate to="/" replace />;

  // Logged in but wrong role → back to dashboard
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
