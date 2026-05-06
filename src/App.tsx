import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Loader from "./components/Loader";
import MainLayout from "./layout/MainLayout";
import PrivateRoute from "./components/PrivateRoute";
import { authService } from "./services/authService";

const Login          = lazy(() => import("./pages/LoginPage"));
const Home           = lazy(() => import("./pages/Home"));
const Upload         = lazy(() => import("./pages/Upload"));
const Template       = lazy(() => import("./pages/TemplateMappingPage"));
const SalesTable     = lazy(() => import("./pages/SalesTable"));
const SalesDetail    = lazy(() => import("./pages/SalesDetail"));
const DeliveryAgents = lazy(() => import("./pages/DeliveryAgents"));
const DeliveryTable  = lazy(() => import("./pages/DeliveryTable"));
const DeliveryList   = lazy(() => import("./pages/DeliveryPage"));
const NotFound       = lazy(() => import("./pages/NotFound"));
const Dashboard      = lazy(() => import("./pages/Dashboard"));
const DeliveryDetails = lazy(() => import("./pages/DeliveryDetails"));
const CustomerList   = lazy(() => import("./pages/CustomerList"));
const DayEnd         = lazy(() => import("./pages/DayEnd"));

const App: React.FC = () => {
  const isLoggedIn = authService.isLoggedIn();

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Login />} />

        {isLoggedIn ? (
          <Route element={<MainLayout />}>
            <Route path="/dashboard"           element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/dayEnd"              element={<PrivateRoute roles={["ADMIN","MANAGER"]}><DayEnd /></PrivateRoute>} />
            <Route path="/upload"              element={<PrivateRoute roles={["ADMIN","MANAGER"]}><Upload /></PrivateRoute>} />
            <Route path="/template"            element={<PrivateRoute roles={["ADMIN"]}><Template /></PrivateRoute>} />
            <Route path="/sales"               element={<PrivateRoute><SalesTable /></PrivateRoute>} />
            <Route path="/sales/:picklistNo"   element={<PrivateRoute><SalesDetail /></PrivateRoute>} />
            <Route path="/agents"              element={<PrivateRoute><DeliveryAgents /></PrivateRoute>} />
            <Route path="/agents/:agentId"     element={<PrivateRoute><DeliveryTable /></PrivateRoute>} />
            <Route path="/customer"            element={<PrivateRoute><CustomerList /></PrivateRoute>} />
            <Route path="/delivery"            element={<PrivateRoute><DeliveryList /></PrivateRoute>} />
            <Route path="/details/:status"     element={<PrivateRoute><DeliveryDetails /></PrivateRoute>} />
            <Route path="*"                    element={<NotFound />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/" replace />} />
        )}
      </Routes>
    </Suspense>
  );
};

export default App;
