import React from "react";
import { Navigate } from "react-router-dom";

interface PrivateRouteProps { children: React.ReactNode; }

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  return isLoggedIn ? <>{children}</> : <Navigate to="/" replace />;
};

export default PrivateRoute;
