import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Loader from "./components/Loader";
import MainLayout from "./layout/MainLayout";
import PrivateRoute from "./components/PrivateRoute";

const Login           = lazy(() => import("./pages/LoginPage"));
const Home            = lazy(() => import("./pages/Home"));
const Upload          = lazy(() => import("./pages/Upload"));
const Template        = lazy(() => import("./pages/TemplateMappingPage"));
const SalesTable      = lazy(() => import("./pages/SalesTable"));
const SalesDetail     = lazy(() => import("./pages/SalesDetail"));
const DeliveryAgents  = lazy(() => import("./pages/DeliveryAgents"));
const DeliveryTable   = lazy(() => import("./pages/DeliveryTable"));
const DeliveryList    = lazy(() => import("./pages/DeliveryPage"));
const NotFound        = lazy(() => import("./pages/NotFound"));
const Dashboard       = lazy(() => import("./pages/Dashboard"));
const DeliveryDetails = lazy(() => import("./pages/DeliveryDetails"));
const CustomerList    = lazy(() => import("./pages/CustomerList"));
const DayEnd          = lazy(() => import("./pages/DayEnd"));

/**
 * ALL routes are always registered — no conditional route tree.
 * PrivateRoute reads authService at render time so the auth check
 * is always fresh from localStorage, regardless of when navigate() was called.
 */
const App: React.FC = () => (
  <Suspense fallback={<Loader />}>
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />

      {/* Protected — wrapped in MainLayout */}
      <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route path="/dashboard"         element={<Dashboard />} />
        <Route path="/sales"             element={<SalesTable />} />
        <Route path="/sales/:picklistNo" element={<SalesDetail />} />
        <Route path="/agents"            element={<DeliveryAgents />} />
        <Route path="/agents/:agentId"   element={<DeliveryTable />} />
        <Route path="/customer"          element={<CustomerList />} />
        <Route path="/delivery"          element={<DeliveryList />} />
        <Route path="/details/:status"   element={<DeliveryDetails />} />

        {/* Role-restricted pages */}
        <Route path="/upload"   element={<PrivateRoute roles={["ADMIN","MANAGER"]}><Upload /></PrivateRoute>} />
        <Route path="/dayEnd"   element={<PrivateRoute roles={["ADMIN","MANAGER"]}><DayEnd /></PrivateRoute>} />
        <Route path="/template" element={<PrivateRoute roles={["ADMIN"]}><Template /></PrivateRoute>} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </Suspense>
);

export default App;
